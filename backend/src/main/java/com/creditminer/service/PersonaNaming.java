package com.creditminer.service;

import com.creditminer.dto.response.ClusterResponse;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Intent: share original-unit persona definitions between offline and online profiles.
 * Status: deterministic; preserves IDs and list order. Next: reevaluate after retraining.
 * Blockers: none. Confidence: centroid and collision tests define the boundaries.
 */
public final class PersonaNaming {
    private PersonaNaming() {}

    public static String name(Map<String, Double> centroid) {
        if (!hasNamingEvidence(centroid)) throw new IllegalArgumentException("Missing persona centroid evidence");
        double delay = centroid.get("MONTHS_DELAYED");
        if (delay >= 3) return "Persistent delayers";
        if (delay >= 1) return "Occasional delayers";
        return centroid.get("PAY_RATIO") >= .6
                ? "Transactors" : "Revolvers, never late";
    }

    public static String tagline(Map<String, Double> centroid) {
        if (!hasNamingEvidence(centroid)) return null;
        return switch (name(centroid)) {
            case "Persistent delayers" -> "Late in at least half of the six statements";
            case "Occasional delayers" -> "Late in some statements, usually less than half";
            case "Transactors" -> "Pay bills in full, high limits";
            default -> "Carry a balance, pay on time";
        };
    }

    private static boolean hasNamingEvidence(Map<String, Double> centroid) {
        return centroid != null && centroid.get("MONTHS_DELAYED") != null && centroid.get("PAY_RATIO") != null
                && Double.isFinite(centroid.get("MONTHS_DELAYED")) && Double.isFinite(centroid.get("PAY_RATIO"));
    }

    public static void apply(List<ClusterResponse> clusters) {
        for (var cluster : clusters) {
            if (!hasNamingEvidence(cluster.getCentroid())) {
                cluster.setDisplayName("Cluster " + cluster.getClusterId());
                cluster.setTagline(null);
            }
        }
        var groups = clusters.stream().filter(c -> hasNamingEvidence(c.getCentroid()))
                .collect(Collectors.groupingBy(c -> name(c.getCentroid())));
        for (var entry : groups.entrySet()) {
            var utilization = Comparator.comparingDouble(
                    (ClusterResponse c) -> c.getCentroid().getOrDefault("AVG_UTILIZATION", 0.0));
            // Preserve the existing pair labels; larger collisions use descending utilization ranks.
            if (entry.getValue().size() >= 3) utilization = utilization.reversed();
            var ordered = entry.getValue().stream()
                    .sorted(utilization.thenComparingInt(ClusterResponse::getClusterId)).toList();
            for (int i = 0; i < ordered.size(); i++) {
                var cluster = ordered.get(i);
                String suffix = switch (ordered.size()) {
                    case 1 -> "";
                    case 2 -> i == 0 ? " (lower utilization)" : " (higher utilization)";
                    case 3 -> List.of(" (highest utilization)", " (middle utilization)",
                            " (lowest utilization)").get(i);
                    default -> " (utilization rank " + (i + 1) + ")";
                };
                cluster.setDisplayName(entry.getKey() + suffix);
                cluster.setTagline(tagline(cluster.getCentroid()));
            }
        }
    }
}
