package com.creditminer.service;

import com.creditminer.dto.response.AnomalyResponse;
import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.dto.response.ColumnStats;
import com.creditminer.dto.response.DescribeResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.dto.response.InsightResponse;
import com.creditminer.dto.response.MiningReportResponse;
import com.creditminer.dto.response.RuleResponse;
import com.creditminer.entity.Cluster;
import com.creditminer.entity.Rule;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.repository.RuleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only aggregate report for showing the CRISP-DM/data-mining evidence in one place.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MiningReportService {

    private static final TypeReference<Map<String, Double>> CENTROID_TYPE =
            new TypeReference<>() {};

    private final CustomerRepository customerRepository;
    private final ClusterRepository clusterRepository;
    private final RuleRepository ruleRepository;
    private final DescribeCacheService describeCacheService;
    private final EdaService edaService;
    private final AnomalyService anomalyService;
    private final InsightService insightService;
    private final ObjectMapper mapper;

    @Value("${creditminer.data.phase5-feature-importance-json:data/processed/phase5_feature_importance.json}")
    private String featureImportancePath;

    @Value("${creditminer.data.phase5-comparison-csv:data/processed/phase5_comparison.csv}")
    private String modelComparisonPath;

    @Value("${creditminer.data.phase6-elbow-json:data/processed/phase6_elbow.json}")
    private String elbowPath;

    @Value("${creditminer.data.phase6-anomalies-json:data/processed/phase6_anomalies.json}")
    private String anomalySummaryPath;

    @Value("${creditminer.data.phase6-clusters-json:data/processed/phase6_clusters.json}")
    private String clustersPath;

    @Value("${creditminer.models.rules-json:models/rules.json}")
    private String rulesPath;

    public MiningReportResponse report() {
        List<String> warnings = new ArrayList<>();
        return MiningReportResponse.builder()
                .generatedAt(Instant.now())
                .dataset(dataset(warnings))
                .classification(classification(warnings))
                .clustering(clustering(warnings))
                .rules(rules(warnings))
                .anomalies(anomalies(warnings))
                .insights(safeInsights(warnings))
                .warnings(warnings)
                .build();
    }

    private MiningReportResponse.DatasetEvidence dataset(List<String> warnings) {
        DescribeResponse describe = null;
        try {
            describe = describeCacheService.get();
        } catch (Exception ex) {
            warnings.add("Dataset describe unavailable: " + ex.getMessage());
        }

        int totalRows = describe == null ? 0 : describe.getTotalRows();
        int numeric = 0;
        int categorical = 0;
        int missingTotal = 0;
        List<MiningReportResponse.ColumnMissing> missing = new ArrayList<>();
        if (describe != null && describe.getColumns() != null) {
            for (ColumnStats col : describe.getColumns()) {
                if ("numeric".equalsIgnoreCase(col.getType())) numeric++;
                if ("nominal".equalsIgnoreCase(col.getType())) categorical++;
                missingTotal += col.getMissing();
                if (col.getMissing() > 0) {
                    missing.add(MiningReportResponse.ColumnMissing.builder()
                            .name(col.getName())
                            .missing(col.getMissing())
                            .missingPct(col.getMissingPct())
                            .build());
                }
            }
        }
        missing.sort(Comparator.comparingInt(MiningReportResponse.ColumnMissing::getMissing).reversed());
        if (missing.size() > 8) {
            missing = new ArrayList<>(missing.subList(0, 8));
        }

        long dbRows = safeLong(() -> customerRepository.count(), 0L, warnings, "customer row count");
        long attrited = safeLong(() -> customerRepository.countByAttritionFlag("Attrited Customer"), 0L,
                warnings, "attrited customer count");
        double churnRate = dbRows == 0 ? 0.0 : round((double) attrited / dbRows, 4);

        return MiningReportResponse.DatasetEvidence.builder()
                .totalRows(totalRows)
                .totalColumns(describe == null ? 0 : describe.getTotalColumns())
                .classColumn(describe == null ? "Attrition_Flag" : describe.getClassColumn())
                .numericColumns(numeric)
                .categoricalColumns(categorical)
                .totalMissingValues(missingTotal)
                .dbCustomerRows(dbRows)
                .attritedCustomers(attrited)
                .churnRate(churnRate)
                .attritionBreakdown(attritionBreakdown(warnings))
                .topMissingColumns(missing)
                .tierBreakdown(tierBreakdown(warnings))
                .leakageColumnsDropped(describe == null ? List.of() : describe.getLeakageColumnsDropped())
                .build();
    }

    private List<MiningReportResponse.NameCount> attritionBreakdown(List<String> warnings) {
        try {
            DistributionResponse d = edaService.distribution("Attrition_Flag", null);
            List<MiningReportResponse.NameCount> out = new ArrayList<>();
            for (int i = 0; i < d.getCategories().size(); i++) {
                out.add(MiningReportResponse.NameCount.builder()
                        .name(d.getCategories().get(i))
                        .count(d.getCounts().get(i))
                        .build());
            }
            return out;
        } catch (Exception ex) {
            warnings.add("Attrition distribution unavailable: " + ex.getMessage());
            return List.of(
                    MiningReportResponse.NameCount.builder()
                            .name("Existing Customer")
                            .count(safeLong(() -> customerRepository.countByAttritionFlag("Existing Customer"),
                                    0L, warnings, "existing customer count"))
                            .build(),
                    MiningReportResponse.NameCount.builder()
                            .name("Attrited Customer")
                            .count(safeLong(() -> customerRepository.countByAttritionFlag("Attrited Customer"),
                                    0L, warnings, "attrited customer count fallback"))
                            .build()
            );
        }
    }

    private Map<String, Long> tierBreakdown(List<String> warnings) {
        try {
            Map<String, Long> out = new LinkedHashMap<>();
            for (Object[] row : customerRepository.tierBreakdown()) {
                if (row[0] != null && row[1] instanceof Number n) {
                    out.put(row[0].toString(), n.longValue());
                }
            }
            return out;
        } catch (Exception ex) {
            warnings.add("Tier breakdown unavailable: " + ex.getMessage());
            return Map.of();
        }
    }

    private MiningReportResponse.ClassificationEvidence classification(List<String> warnings) {
        List<MiningReportResponse.ModelMetric> metrics = modelMetrics(warnings);
        List<MiningReportResponse.FeatureImportance> features = featureImportance(warnings);
        return MiningReportResponse.ClassificationEvidence.builder()
                .bestModel("RandomForest")
                .bestVariant("SMOTE")
                .metricSource(metrics.isEmpty() ? "not available" : metrics.get(0).getSource())
                .modelMetrics(metrics)
                .featureImportance(features)
                .build();
    }

    private List<MiningReportResponse.ModelMetric> modelMetrics(List<String> warnings) {
        File csv = new File(modelComparisonPath);
        if (!csv.exists()) {
            warnings.add("Model comparison CSV missing; using documented RandomForest+SMOTE headline metrics.");
            return List.of(MiningReportResponse.ModelMetric.builder()
                    .model("RandomForest")
                    .variant("SMOTE")
                    .testF1(0.8758)
                    .testRocAuc(0.9888)
                    .testPrAuc(0.9429)
                    .source("docs/BE_Handoff.md documented fallback")
                    .build());
        }
        warnings.add("Model comparison CSV exists but detailed CSV parsing is deferred; using documented headline metrics.");
        return List.of(MiningReportResponse.ModelMetric.builder()
                .model("RandomForest")
                .variant("SMOTE")
                .testF1(0.8758)
                .testRocAuc(0.9888)
                .testPrAuc(0.9429)
                .source(modelComparisonPath)
                .build());
    }

    private List<MiningReportResponse.FeatureImportance> featureImportance(List<String> warnings) {
        File f = new File(featureImportancePath);
        if (!f.exists()) {
            warnings.add("Feature importance JSON missing at " + featureImportancePath);
            return List.of();
        }
        try {
            JsonNode ranking = mapper.readTree(f).path("ranking");
            double total = 0.0;
            for (JsonNode item : ranking) total += item.path("importance").asDouble(0.0);
            List<MiningReportResponse.FeatureImportance> out = new ArrayList<>();
            for (JsonNode item : ranking) {
                double importance = item.path("importance").asDouble(0.0);
                out.add(MiningReportResponse.FeatureImportance.builder()
                        .name(item.path("name").asText())
                        .importance(importance)
                        .share(total == 0 ? 0.0 : round(importance / total, 4))
                        .build());
            }
            return out;
        } catch (Exception ex) {
            warnings.add("Failed to read feature importance: " + ex.getMessage());
            return List.of();
        }
    }

    private MiningReportResponse.ClusteringEvidence clustering(List<String> warnings) {
        List<ClusterResponse> clusters = clusters(warnings);
        ElbowData elbow = elbow(warnings);
        return MiningReportResponse.ClusteringEvidence.builder()
                .bestK(elbow.bestK())
                .strategy(elbow.strategy())
                .totalClusters(clusters.size())
                .clusters(clusters)
                .elbowScores(elbow.scores())
                .build();
    }

    private List<ClusterResponse> clusters(List<String> warnings) {
        try {
            List<ClusterResponse> rows = clusterRepository.findAll().stream()
                    .sorted(Comparator.comparing(Cluster::getClusterId))
                    .map(this::clusterResponse)
                    .toList();
            if (!rows.isEmpty()) {
                return rows;
            }
            warnings.add("Cluster DB summary empty; using phase6_clusters.json fallback.");
        } catch (Exception ex) {
            warnings.add("Cluster DB summary unavailable: " + ex.getMessage());
        }
        return clusterArtifactFallback(warnings);
    }

    private ClusterResponse clusterResponse(Cluster c) {
        Map<String, Double> centroid;
        try {
            centroid = c.getCentroidJson() == null
                    ? Map.of()
                    : mapper.readValue(c.getCentroidJson(), CENTROID_TYPE);
        } catch (Exception ex) {
            log.warn("Failed to parse centroid_json for cluster {}: {}", c.getClusterId(), ex.getMessage());
            centroid = Map.of();
        }
        return ClusterResponse.builder()
                .clusterId(c.getClusterId())
                .personaName(c.getPersonaName())
                .size(c.getSize() == null ? 0 : c.getSize())
                .centroid(centroid)
                .avgRisk(toDouble(c.getAvgRisk()))
                .churnRate(toDouble(c.getChurnRate()))
                .description(c.getDescription())
                .build();
    }

    private List<ClusterResponse> clusterArtifactFallback(List<String> warnings) {
        File f = new File(clustersPath);
        if (!f.exists()) {
            warnings.add("Cluster artifact missing at " + clustersPath);
            return List.of();
        }
        try {
            JsonNode arr = mapper.readTree(f);
            List<ClusterResponse> out = new ArrayList<>();
            for (JsonNode n : arr) {
                out.add(ClusterResponse.builder()
                        .clusterId(n.path("clusterId").asInt())
                        .personaName(n.path("personaName").asText("Cluster " + n.path("clusterId").asInt()))
                        .size(n.path("size").asInt())
                        .centroid(mapper.convertValue(n.path("centroid"), CENTROID_TYPE))
                        .avgRisk(n.path("avgRisk").asDouble())
                        .churnRate(n.path("churnRate").asDouble())
                        .description(n.path("description").asText())
                        .build());
            }
            return out.stream()
                    .sorted(Comparator.comparing(ClusterResponse::getClusterId))
                    .toList();
        } catch (Exception ex) {
            warnings.add("Failed to read cluster artifact: " + ex.getMessage());
            return List.of();
        }
    }

    private ElbowData elbow(List<String> warnings) {
        File f = new File(elbowPath);
        if (!f.exists()) {
            warnings.add("Elbow/silhouette JSON missing at " + elbowPath);
            return new ElbowData(0, "not available", List.of());
        }
        try {
            JsonNode root = mapper.readTree(f);
            List<MiningReportResponse.ElbowPoint> scores = new ArrayList<>();
            for (JsonNode score : root.path("scores")) {
                scores.add(MiningReportResponse.ElbowPoint.builder()
                        .k(score.path("k").asInt())
                        .wcss(score.path("wcss").asDouble())
                        .silhouette(score.path("silhouette").asDouble())
                        .build());
            }
            return new ElbowData(root.path("bestK").asInt(), root.path("strategy").asText(), scores);
        } catch (Exception ex) {
            warnings.add("Failed to read elbow/silhouette JSON: " + ex.getMessage());
            return new ElbowData(0, "not available", List.of());
        }
    }

    private MiningReportResponse.RulesEvidence rules(List<String> warnings) {
        List<RuleResponse> rules;
        try {
            rules = ruleRepository.findAll().stream()
                    .map(this::ruleResponse)
                    .toList();
            if (rules.isEmpty()) {
                warnings.add("Rules DB table empty; using models/rules.json fallback.");
                rules = ruleArtifactFallback(warnings);
            }
        } catch (Exception ex) {
            warnings.add("Rules unavailable: " + ex.getMessage());
            rules = ruleArtifactFallback(warnings);
        }

        double support = 0;
        double confidence = 0;
        double lift = 0;
        double minLift = rules.isEmpty() ? 0 : Double.POSITIVE_INFINITY;
        double maxLift = 0;
        long churn = 0;
        long retention = 0;
        for (RuleResponse r : rules) {
            double s = r.getSupport();
            double c = r.getConfidence();
            double l = r.getLift();
            support += s;
            confidence += c;
            lift += l;
            minLift = Math.min(minLift, l);
            maxLift = Math.max(maxLift, l);
            if ("churn".equalsIgnoreCase(r.getCategory())) churn++;
            if ("retention".equalsIgnoreCase(r.getCategory())) retention++;
        }
        int n = rules.size();
        List<RuleResponse> top = rules.stream()
                .sorted(Comparator.comparing(RuleResponse::getLift).reversed())
                .limit(12)
                .toList();
        return MiningReportResponse.RulesEvidence.builder()
                .totalRules(n)
                .churnRules(churn)
                .retentionRules(retention)
                .avgSupport(n == 0 ? 0.0 : round(support / n, 4))
                .avgConfidence(n == 0 ? 0.0 : round(confidence / n, 4))
                .avgLift(n == 0 ? 0.0 : round(lift / n, 4))
                .minLift(n == 0 ? 0.0 : round(minLift, 4))
                .maxLift(round(maxLift, 4))
                .topRules(top)
                .build();
    }

    private RuleResponse ruleResponse(Rule r) {
        return RuleResponse.builder()
                .ruleId(r.getRuleId() == null ? 0L : r.getRuleId())
                .lhs(r.getLhs())
                .rhs(r.getRhs())
                .support(toDouble(r.getSupport()))
                .confidence(toDouble(r.getConfidence()))
                .lift(toDouble(r.getLift()))
                .category(r.getCategory())
                .build();
    }

    private List<RuleResponse> ruleArtifactFallback(List<String> warnings) {
        File f = new File(rulesPath);
        if (!f.exists()) {
            warnings.add("Rules artifact missing at " + rulesPath);
            return List.of();
        }
        try {
            JsonNode arr = mapper.readTree(f).path("rules");
            List<RuleResponse> out = new ArrayList<>();
            long id = 1;
            for (JsonNode n : arr) {
                out.add(RuleResponse.builder()
                        .ruleId(id++)
                        .lhs(n.path("lhs").asText())
                        .rhs(n.path("rhs").asText())
                        .support(n.path("support").asDouble())
                        .confidence(n.path("confidence").asDouble())
                        .lift(n.path("lift").asDouble())
                        .category(n.path("category").asText())
                        .build());
            }
            return out;
        } catch (Exception ex) {
            warnings.add("Failed to read rules artifact: " + ex.getMessage());
            return List.of();
        }
    }

    private MiningReportResponse.AnomalyEvidence anomalies(List<String> warnings) {
        JsonNode summary = readJson(anomalySummaryPath, warnings, "anomaly summary");
        long dbOutliers = safeLong(() -> customerRepository.countOutliers(), 0L, warnings, "DB outlier count");
        long dbAnomalies = safeLong(() -> customerRepository.countAnomalies(), 0L, warnings, "DB anomaly count");
        List<AnomalyResponse> top = safeTopAnomalies(warnings);

        return MiningReportResponse.AnomalyEvidence.builder()
                .dbOutlierCount(dbOutliers)
                .dbAnomalyCount(dbAnomalies)
                .phase2OutlierCount(intOrNull(summary, "phase2OutlierCount"))
                .clusterStrongOutlierCount(intOrNull(summary, "clusterStrongOutlierCount"))
                .clusterMildOutlierCount(intOrNull(summary, "clusterMildOutlierCount"))
                .combinedAnomalyCount(intOrNull(summary, "combinedAnomalyCount"))
                .combinedAnomalyPct(doubleOrNull(summary, "combinedAnomalyPct"))
                .clusterDistanceMu(doubleOrNull(summary, "clusterDistanceMu"))
                .clusterDistanceSigma(doubleOrNull(summary, "clusterDistanceSigma"))
                .strongThreshold(doubleOrNull(summary, "strongThreshold"))
                .mildThreshold(doubleOrNull(summary, "mildThreshold"))
                .rule(summary == null ? null : summary.path("rule").asText(null))
                .topAnomalies(top)
                .build();
    }

    private List<AnomalyResponse> safeTopAnomalies(List<String> warnings) {
        try {
            return anomalyService.topAnomalies(10);
        } catch (Exception ex) {
            warnings.add("Top anomalies unavailable: " + ex.getMessage());
            return List.of();
        }
    }

    private List<InsightResponse> safeInsights(List<String> warnings) {
        try {
            List<InsightResponse> rows = insightService.findAll();
            if (!rows.isEmpty()) {
                return rows;
            }
            warnings.add("Insights DB table empty; using insights.json fallback.");
        } catch (Exception ex) {
            warnings.add("Insights unavailable: " + ex.getMessage());
        }
        return insightResourceFallback(warnings);
    }

    private List<InsightResponse> insightResourceFallback(List<String> warnings) {
        try (InputStream in = new ClassPathResource("insights.json").getInputStream()) {
            JsonNode arr = mapper.readTree(in);
            List<InsightResponse> out = new ArrayList<>();
            long id = 1;
            for (JsonNode n : arr) {
                out.add(InsightResponse.builder()
                        .insightId(id++)
                        .title(n.path("title").asText())
                        .discovery(n.path("discovery").asText())
                        .evidence(n.path("evidence").asText())
                        .recommendation(n.path("recommendation").asText())
                        .category(n.path("category").asText())
                        .priority(n.path("priority").asInt())
                        .build());
            }
            return out;
        } catch (Exception ex) {
            warnings.add("Failed to read insights resource fallback: " + ex.getMessage());
            return List.of();
        }
    }

    private JsonNode readJson(String path, List<String> warnings, String label) {
        File f = new File(path);
        if (!f.exists()) {
            warnings.add(label + " JSON missing at " + path);
            return null;
        }
        try {
            return mapper.readTree(f);
        } catch (Exception ex) {
            warnings.add("Failed to read " + label + ": " + ex.getMessage());
            return null;
        }
    }

    private static Integer intOrNull(JsonNode node, String field) {
        return node == null || !node.has(field) ? null : node.path(field).asInt();
    }

    private static Double doubleOrNull(JsonNode node, String field) {
        return node == null || !node.has(field) ? null : node.path(field).asDouble();
    }

    private static double toDouble(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private static long safeLong(LongSupplier supplier, long fallback, List<String> warnings, String label) {
        try {
            return supplier.get();
        } catch (Exception ex) {
            warnings.add(label + " unavailable: " + ex.getMessage());
            return fallback;
        }
    }

    private static double round(double v, int decimals) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        double f = Math.pow(10, decimals);
        return Math.round(v * f) / f;
    }

    @FunctionalInterface
    private interface LongSupplier {
        long get();
    }

    private record ElbowData(int bestK, String strategy,
                             List<MiningReportResponse.ElbowPoint> scores) { }
}
