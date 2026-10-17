package com.creditminer.service;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.dto.response.ClusterResponse.Baseline;
import com.creditminer.dto.response.ClusterResponse.Evidence;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Intent: compare persisted clusters with the actual portfolio in original units.
 * Status: read-only, lazy cached aggregate; no pipeline or schema work.
 * Next: invalidate/restart after replacing the dataset. Blockers: none.
 * Confidence: synthetic aggregate and endpoint tests cover the response contract.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClusterService {
    private static final List<String> PROPERTIES = List.of("utilization1", "avgUtilization",
            "payRatio", "monthsDelayed", "maxDelay", "billTrend", "limitBal", "age");

    // Clip each customer's status code before averaging; clipping a centroid is incorrect.
    static final String LONGEST_DELAY_BY_CLUSTER_QUERY = "select c.clusterId, "
            + "avg(case when c.maxDelay < 0 then 0 else c.maxDelay end) "
            + "from Customer c where c.clusterId is not null group by c.clusterId";

    private final EntityManager entityManager;
    private final ObjectMapper mapper;
    @Value("${creditminer.data.phase6-elbow-json:data/processed/phase6_elbow.json}")
    private String elbowPath;
    private volatile ProfileContext cached;

    public List<ClusterResponse> enrich(List<ClusterResponse> clusters) {
        if (clusters.isEmpty()) return clusters;
        ProfileContext context = context();
        clusters.forEach(cluster -> cluster.setLongestDelayMonths(context.longestDelayByCluster().get(cluster.getClusterId())));
        applyProfiles(clusters, context.baseline(), context.std(), context.evidence());
        return clusters;
    }

    public synchronized void invalidate() {
        cached = null;
    }

    private ProfileContext context() {
        ProfileContext local = cached;
        if (local != null) return local;
        synchronized (this) {
            if (cached == null) {
                ProfileContext loaded = loadContext();
                // A request during seeding may see an incomplete baseline; retry on the next request.
                if (loaded.baseline().getSize() > 0 && loaded.baseline().getCentroid().values().stream()
                        .noneMatch(mean -> mean == null)) cached = loaded;
                return loaded;
            }
            return cached;
        }
    }

    private ProfileContext loadContext() {
        StringBuilder query = new StringBuilder(
                "select count(c), sum(case when c.defaultFlag = 'Yes' then 1 else 0 end)");
        for (String property : PROPERTIES) {
            query.append(", avg(c.").append(property).append("), avg(c.")
                    .append(property).append(" * c.").append(property).append(")");
        }
        query.append(", avg(case when c.maxDelay < 0 then 0 else c.maxDelay end) from Customer c");
        Object[] row = entityManager.createQuery(query.toString(), Object[].class).getSingleResult();
        long size = ((Number) row[0]).longValue();
        double defaults = row[1] == null ? 0 : ((Number) row[1]).doubleValue();
        Map<String, Double> means = new LinkedHashMap<>();
        Map<String, Double> std = new LinkedHashMap<>();
        for (int i = 0; i < PROPERTIES.size(); i++) {
            String feature = ClusteringService.CLUSTER_FEATURES.get(i);
            Double mean = row[2 + 2 * i] == null ? null : ((Number) row[2 + 2 * i]).doubleValue();
            means.put(feature, mean);
            if (mean != null && row[3 + 2 * i] != null) {
                double secondMoment = ((Number) row[3 + 2 * i]).doubleValue();
                std.put(feature, Math.sqrt(Math.max(0, secondMoment - mean * mean)));
            }
        }
        Map<Integer, Double> longestDelayByCluster = new LinkedHashMap<>();
        for (Object[] group : entityManager.createQuery(LONGEST_DELAY_BY_CLUSTER_QUERY, Object[].class).getResultList()) {
            if (group[1] != null) longestDelayByCluster.put(((Number) group[0]).intValue(), ((Number) group[1]).doubleValue());
        }
        Double longestDelay = row[18] == null ? null : ((Number) row[18]).doubleValue();
        return new ProfileContext(Baseline.builder().size(size).longestDelayMonths(longestDelay)
                .defaultRate(size == 0 ? 0 : defaults / size).centroid(means).build(), std, loadEvidence(), longestDelayByCluster);
    }

    private Evidence loadEvidence() {
        try {
            JsonNode root = mapper.readTree(new File(elbowPath));
            if (!root.path("bestK").canConvertToInt()) return null;
            int k = root.path("bestK").asInt();
            if (root.path("finalSilhouette").isNumber()) {
                return Evidence.builder().k(k).silhouette(root.path("finalSilhouette").asDouble())
                        .method(root.path("strategy").asText("final-model silhouette")).build();
            }
            // Sweep models can use a different seed and initialization from the selected model.
            return Evidence.builder().k(k).silhouette(null)
                    .method("final-model silhouette unavailable").build();
        } catch (IOException ex) {
            log.warn("Cluster selection evidence unavailable at {}: {}", elbowPath, ex.getMessage());
        }
        return null;
    }

    static void applyProfiles(List<ClusterResponse> clusters, Baseline baseline,
                              Map<String, Double> std, Evidence evidence) {
        double defaults = clusters.stream().mapToDouble(c -> c.getSize() * c.getDefaultRate()).sum();
        PersonaNaming.apply(clusters);
        for (ClusterResponse cluster : clusters) {
            Map<String, Double> centroid = cluster.getCentroid() == null ? Map.of() : cluster.getCentroid();
            cluster.setBaseline(baseline);
            cluster.setShareOfClients(divide(cluster.getSize(), baseline.getSize()));
            cluster.setShareOfDefaults(divide(cluster.getSize() * cluster.getDefaultRate(), defaults));
            cluster.setDefaultRateMultiplier(divide(cluster.getDefaultRate(), baseline.getDefaultRate()));
            // Do not attach stale k-selection evidence to a different set of stored clusters.
            cluster.setEvidence(evidence != null && evidence.getK() == clusters.size() ? evidence : null);
            Map<String, Double> delta = new LinkedHashMap<>();
            for (String feature : ClusteringService.CLUSTER_FEATURES) {
                Double mean = baseline.getCentroid().get(feature);
                Double value = centroid.get(feature);
                if (mean != null && value != null) delta.put(feature, value - mean);
            }
            cluster.setCentroidDelta(delta);
            Map<String, Double> traitValues = new LinkedHashMap<>(centroid);
            Map<String, Double> traitBaseline = new LinkedHashMap<>(baseline.getCentroid());
            traitValues.put("MAX_DELAY", cluster.getLongestDelayMonths());
            traitBaseline.put("MAX_DELAY", baseline.getLongestDelayMonths());
            cluster.setTraits(delta.keySet().stream()
                    .filter(feature -> traitValues.get(feature) != null && traitBaseline.get(feature) != null)
                    .sorted(Comparator.<String>comparingDouble(feature -> score(feature, delta, baseline, std))
                            .reversed())
                    .limit(3).map(feature -> trait(feature, traitValues.get(feature),
                            traitBaseline.get(feature))).toList());
        }
    }

    private static double score(String feature, Map<String, Double> delta,
                                Baseline baseline, Map<String, Double> std) {
        double scale = std.getOrDefault(feature, 0.0);
        if (scale <= 0) scale = Math.abs(baseline.getCentroid().get(feature));
        // A zero baseline and zero spread cannot provide a meaningful relative ranking.
        return scale == 0 ? 0 : Math.abs(delta.get(feature)) / scale;
    }

    private static Double divide(double numerator, double denominator) {
        return denominator == 0 ? null : numerator / denominator;
    }

    private static String trait(String feature, double value, double baseline) {
        return switch (feature) {
            case "MONTHS_DELAYED" -> String.format(Locale.ROOT, "Late months (of 6): %.1f vs %.1f", value, baseline);
            case "MAX_DELAY" -> String.format(Locale.ROOT, "Longest delay: %.1f months vs %.1f", value, baseline);
            case "LIMIT_BAL" -> String.format(Locale.ROOT, "Credit limit: NT$%.0fk vs NT$%.0fk", value / 1000, baseline / 1000);
            case "PAY_RATIO" -> String.format(Locale.ROOT, "Payment ratio: %.0f%% vs %.0f%%", value * 100, baseline * 100);
            case "UTILIZATION_1" -> String.format(Locale.ROOT, "Utilization, Sep: %.0f%% vs %.0f%%", value * 100, baseline * 100);
            case "AVG_UTILIZATION" -> String.format(Locale.ROOT, "Average utilization: %.0f%% vs %.0f%%", value * 100, baseline * 100);
            case "BILL_TREND" -> String.format(Locale.ROOT, "Bill trend: %.0f%% vs %.0f%%", value * 100, baseline * 100);
            case "AGE" -> String.format(Locale.ROOT, "Age: %.1f years vs %.1f", value, baseline);
            default -> throw new IllegalArgumentException("Unknown cluster feature: " + feature);
        };
    }

    private record ProfileContext(Baseline baseline, Map<String, Double> std, Evidence evidence,
                                  Map<Integer, Double> longestDelayByCluster) {}
}
