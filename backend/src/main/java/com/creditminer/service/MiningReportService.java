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
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import weka.core.Instances;
import weka.core.SerializationHelper;

import java.io.File;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
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

    @Value("${creditminer.data.phase5-evaluation-json:data/processed/phase5_evaluation.json}")
    private String phase5EvaluationPath;

    @Value("${creditminer.data.describe-json:data/processed/phase1_describe.json}")
    private String phase1DescribePath;

    @Value("${creditminer.data.phase2-report-json:data/processed/phase2_report.json}")
    private String phase2ReportPath;

    @Value("${creditminer.data.phase3-report-json:data/processed/phase3_report.json}")
    private String phase3ReportPath;

    @Value("${creditminer.data.assoc-arff:data/processed/clean_assoc.arff}")
    private String associationArffPath;

    @Value("${creditminer.data.phase6-elbow-json:data/processed/phase6_elbow.json}")
    private String elbowPath;

    @Value("${creditminer.data.phase6-anomalies-json:data/processed/phase6_anomalies.json}")
    private String anomalySummaryPath;

    @Value("${creditminer.data.phase6-clusters-json:data/processed/phase6_clusters.json}")
    private String clustersPath;

    @Value("${creditminer.models.rules-json:models/rules.json}")
    private String rulesPath;

    @Value("${creditminer.models.kmeans-input-header:models/kmeans-input-header.model}")
    private String kmeansInputHeaderPath;

    public MiningReportResponse report() {
        List<String> warnings = new ArrayList<>();
        MiningReportResponse.ClassificationEvidence classification = classification(warnings);
        MiningReportResponse.AnomalyEvidence anomalies = anomalies(warnings);
        return MiningReportResponse.builder()
                .generatedAt(Instant.now())
                .dataset(dataset(warnings))
                .classification(classification)
                .clustering(clustering(warnings))
                .rules(rules(warnings))
                .anomalies(anomalies)
                .methodology(methodology(classification.getEvaluation(), anomalies, warnings))
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
        MiningReportResponse.EvaluationEvidence evaluation = evaluation(warnings);
        String bestModel = "RandomForest";
        String bestVariant = "SMOTE";
        if (evaluation != null && evaluation.getBestVariant() != null) {
            bestModel = evaluation.getBestVariant().path("algo").asText(bestModel);
            bestVariant = evaluation.getBestVariant().path("variant").asText(bestVariant);
        }
        return MiningReportResponse.ClassificationEvidence.builder()
                .bestModel(bestModel)
                .bestVariant(bestVariant)
                .metricSource(metrics.isEmpty() ? "not available" : metrics.get(0).getSource())
                .modelMetrics(metrics)
                .featureImportance(features)
                .evaluation(evaluation)
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
        try {
            List<String> lines = Files.readAllLines(csv.toPath(), StandardCharsets.UTF_8);
            if (lines.isEmpty()) return List.of();
            String[] header = lines.get(0).split(",", -1);
            Map<String, Integer> indexes = new LinkedHashMap<>();
            for (int i = 0; i < header.length; i++) indexes.put(header[i].trim(), i);
            List<MiningReportResponse.ModelMetric> out = new ArrayList<>();
            for (int row = 1; row < lines.size(); row++) {
                if (lines.get(row).isBlank()) continue;
                String[] values = lines.get(row).split(",", -1);
                out.add(MiningReportResponse.ModelMetric.builder()
                        .model(csvValue(values, indexes, "algo"))
                        .variant(csvValue(values, indexes, "variant"))
                        .cvAccuracy(csvDouble(values, indexes, "cv_accuracy"))
                        .cvF1(csvDouble(values, indexes, "cv_f1_attrited"))
                        .cvRocAuc(csvDouble(values, indexes, "cv_roc_auc"))
                        .cvPrAuc(csvDouble(values, indexes, "cv_pr_auc"))
                        .testAccuracy(csvDouble(values, indexes, "test_accuracy"))
                        .testPrecision(csvDouble(values, indexes, "test_precision_attrited"))
                        .testRecall(csvDouble(values, indexes, "test_recall_attrited"))
                        .testF1(csvDouble(values, indexes, "test_f1_attrited"))
                        .testRocAuc(csvDouble(values, indexes, "test_roc_auc"))
                        .testPrAuc(csvDouble(values, indexes, "test_pr_auc"))
                        .source(modelComparisonPath)
                        .build());
            }
            return out;
        } catch (Exception ex) {
            warnings.add("Failed to parse model comparison CSV: " + ex.getMessage());
            return List.of();
        }
    }

    private MiningReportResponse.EvaluationEvidence evaluation(List<String> warnings) {
        JsonNode root = readJson(phase5EvaluationPath, warnings, "phase5 evaluation");
        if (root == null) return null;
        try {
            List<JsonNode> variants = new ArrayList<>();
            for (JsonNode rawVariant : root.path("variants")) {
                if (!rawVariant.isObject()) continue;
                ObjectNode variant = rawVariant.deepCopy();
                sanitizeCurve(variant, "rocCurve", "fpr", "tpr", "threshold");
                sanitizeCurve(variant, "prCurve", "recall", "precision", "threshold");
                variants.add(variant);
            }
            return MiningReportResponse.EvaluationEvidence.builder()
                    .split(root.path("split"))
                    .variants(variants)
                    .bestVariant(root.path("bestVariant"))
                    .build();
        } catch (Exception ex) {
            warnings.add("Failed to parse phase5 evaluation: " + ex.getMessage());
            return null;
        }
    }

    /*
     * Older Phase 5 artifacts may contain null or non-finite Weka threshold values.
     * Keep the read boundary defensive so one bad point cannot invalidate the report API.
     */
    private void sanitizeCurve(ObjectNode variant, String curveName, String... requiredFields) {
        ArrayNode sanitized = mapper.createArrayNode();
        JsonNode rawCurve = variant.path(curveName);
        if (rawCurve.isArray()) {
            for (JsonNode point : rawCurve) {
                if (isFiniteCurvePoint(point, requiredFields)) sanitized.add(point.deepCopy());
            }
        }
        variant.set(curveName, sanitized);
    }

    private static boolean isFiniteCurvePoint(JsonNode point, String... requiredFields) {
        if (!point.isObject()) return false;
        for (String field : requiredFields) {
            JsonNode value = point.get(field);
            if (value == null || !value.isNumber() || !Double.isFinite(value.doubleValue())) {
                return false;
            }
        }
        return true;
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

    private MiningReportResponse.Methodology methodology(
            MiningReportResponse.EvaluationEvidence evaluation,
            MiningReportResponse.AnomalyEvidence anomalies,
            List<String> warnings) {
        return MiningReportResponse.Methodology.builder()
                .preprocessing(preprocessingMethodology(warnings))
                .featureEngineering(featureEngineeringMethodology(warnings))
                .split(evaluation == null ? null : evaluation.getSplit())
                .clustering(clusteringMethodology(warnings))
                .associationRules(associationMethodology(warnings))
                .anomaly(MiningReportResponse.AnomalyMethodology.builder()
                        .rule(anomalies.getRule())
                        .mu(anomalies.getClusterDistanceMu())
                        .sigma(anomalies.getClusterDistanceSigma())
                        .strongThreshold(anomalies.getStrongThreshold())
                        .mildThreshold(anomalies.getMildThreshold())
                        .build())
                .build();
    }

    private MiningReportResponse.PreprocessingMethodology preprocessingMethodology(List<String> warnings) {
        JsonNode phase2 = readJson(phase2ReportPath, warnings, "phase2 report");
        JsonNode phase1 = readJson(phase1DescribePath, warnings, "phase1 describe");
        Map<String, Integer> unknown = new LinkedHashMap<>();
        Map<String, Double> medians = new LinkedHashMap<>();
        Map<String, MiningReportResponse.OutlierColumnMethodology> outliers = new LinkedHashMap<>();
        List<String> leakage = new ArrayList<>();
        if (phase2 != null) {
            phase2.path("unknownRewritten").fields().forEachRemaining(entry ->
                    unknown.put(entry.getKey(), entry.getValue().asInt()));
            phase2.path("numericMedianImputed").fields().forEachRemaining(entry ->
                    medians.put(entry.getKey(), entry.getValue().asDouble()));
            phase2.path("outlierByColumn").fields().forEachRemaining(entry -> {
                JsonNode value = entry.getValue();
                outliers.put(entry.getKey(), MiningReportResponse.OutlierColumnMethodology.builder()
                        .zscoreCount(value.path("zscoreCount").asInt())
                        .iqrCount(value.path("iqrCount").asInt())
                        .combinedCount(value.path("combinedCount").asInt())
                        .mean(value.path("mean").asDouble())
                        .std(value.path("std").asDouble())
                        .q1(value.path("q1").asDouble())
                        .q3(value.path("q3").asDouble())
                        .build());
            });
        }
        if (phase1 != null) {
            phase1.path("leakageColumnsDropped").forEach(node -> leakage.add(node.asText()));
        }
        return MiningReportResponse.PreprocessingMethodology.builder()
                .rowsIn(phase2 == null ? 0 : phase2.path("totalRowsIn").asInt())
                .rowsOut(phase2 == null ? 0 : phase2.path("totalRowsOut").asInt())
                .duplicatesDropped(phase2 == null ? 0 : phase2.path("duplicatesDropped").asInt())
                .unknownRewritten(unknown)
                .numericMedianImputed(medians)
                .outlierByColumn(outliers)
                .leakageColumnsDropped(leakage)
                .outlierPolicy("flag only, rows retained")
                .build();
    }

    private MiningReportResponse.FeatureEngineeringMethodology featureEngineeringMethodology(List<String> warnings) {
        JsonNode phase3 = readJson(phase3ReportPath, warnings, "phase3 report");
        List<MiningReportResponse.DerivedFeatureMethodology> features = new ArrayList<>();
        if (phase3 != null) {
            for (JsonNode feature : phase3.path("derivedFeatures")) {
                features.add(MiningReportResponse.DerivedFeatureMethodology.builder()
                        .name(feature.path("name").asText())
                        .type(feature.path("type").asText())
                        .mean(numberOrNull(feature, "mean"))
                        .std(numberOrNull(feature, "std"))
                        .min(numberOrNull(feature, "min"))
                        .max(numberOrNull(feature, "max"))
                        .formula(featureFormula(feature.path("name").asText()))
                        .build());
            }
        }
        return MiningReportResponse.FeatureEngineeringMethodology.builder()
                .columnsIn(phase3 == null ? 0 : phase3.path("totalColumnsIn").asInt())
                .columnsOut(phase3 == null ? 0 : phase3.path("totalColumnsOut").asInt())
                .derivedFeatures(features)
                .build();
    }

    private MiningReportResponse.ClusteringMethodology clusteringMethodology(List<String> warnings) {
        JsonNode elbow = readJson(elbowPath, warnings, "elbow/silhouette");
        List<MiningReportResponse.ElbowPoint> points = new ArrayList<>();
        if (elbow != null) {
            for (JsonNode point : elbow.path("scores")) {
                points.add(MiningReportResponse.ElbowPoint.builder()
                        .k(point.path("k").asInt())
                        .wcss(point.path("wcss").asDouble())
                        .silhouette(point.path("silhouette").asDouble())
                        .build());
            }
        }
        return MiningReportResponse.ClusteringMethodology.builder()
                .kMin(elbow == null ? 0 : elbow.path("kMin").asInt())
                .kMax(elbow == null ? 0 : elbow.path("kMax").asInt())
                .bestK(elbow == null ? 0 : elbow.path("bestK").asInt())
                .strategy(elbow == null ? "not available" : elbow.path("strategy").asText())
                .seed(42)
                .maxIterations(500)
                .normalization("min-max")
                .featuresUsed(kmeansFeatures(warnings))
                .elbow(points)
                .build();
    }

    private List<String> kmeansFeatures(List<String> warnings) {
        File headerFile = new File(kmeansInputHeaderPath);
        if (!headerFile.exists()) {
            warnings.add("KMeans input header missing at " + kmeansInputHeaderPath);
            return List.of();
        }
        try {
            Object serialized = SerializationHelper.read(kmeansInputHeaderPath);
            if (!(serialized instanceof Instances header)) {
                warnings.add("KMeans input header is not a Weka Instances object");
                return List.of();
            }
            List<String> names = new ArrayList<>(header.numAttributes());
            for (int i = 0; i < header.numAttributes(); i++) names.add(header.attribute(i).name());
            return names;
        } catch (Exception ex) {
            warnings.add("Failed to read KMeans input header: " + ex.getMessage());
            return List.of();
        }
    }

    private MiningReportResponse.AssociationMethodology associationMethodology(List<String> warnings) {
        JsonNode rules = readJson(rulesPath, warnings, "rules");
        JsonNode config = rules == null ? null : rules.path("config");
        JsonNode retention = config == null ? null
                : (config.has("retentionPass") ? config.path("retentionPass") : config);
        JsonNode churn = config == null ? null : config.path("churnPass");
        List<String> attributes = associationAttributes(warnings);
        long discretizedCount = attributes.stream()
                .filter(AssociationService.NUMERIC_TO_DISCRETIZE::contains)
                .count();
        return MiningReportResponse.AssociationMethodology.builder()
                .discretization("3 equal-frequency bins on " + discretizedCount + " numerics")
                .attributesUsed(attributes)
                .retentionPass(associationPass(retention))
                .churnPass(associationPass(churn))
                .build();
    }

    private MiningReportResponse.AssociationPass associationPass(JsonNode config) {
        if (config == null || config.isMissingNode()) return null;
        return MiningReportResponse.AssociationPass.builder()
                .minSupport(numberOrNull(config, "minSupport"))
                .minConfidence(numberOrNull(config, "minConfidence"))
                .minLift(numberOrNull(config, "minLift"))
                .numRules(config.has("numRules") ? config.path("numRules").asInt() : null)
                .metric(config.has("metric") ? config.path("metric").asText() : null)
                .build();
    }

    private List<String> associationAttributes(List<String> warnings) {
        File arff = new File(associationArffPath);
        if (!arff.exists()) {
            warnings.add("Association ARFF missing at " + associationArffPath);
            return List.of();
        }
        // Read with an explicitly closed reader: DataSource.getDataSet() leaves the file handle
        // open, which on Windows pins clean_assoc.arff and makes Phase7Pipeline fail to rewrite it.
        try (java.io.Reader reader = Files.newBufferedReader(arff.toPath(), StandardCharsets.UTF_8)) {
            Instances data = new Instances(reader);
            List<String> names = new ArrayList<>(data.numAttributes());
            for (int i = 0; i < data.numAttributes(); i++) names.add(data.attribute(i).name());
            return names;
        } catch (Exception ex) {
            warnings.add("Failed to read association ARFF: " + ex.getMessage());
            return List.of();
        }
    }

    private static String featureFormula(String name) {
        return switch (name) {
            case "Utilization_Score" -> "Utilization_Score = Total_Revolving_Bal / Credit_Limit";
            case "Spending_Intensity" -> "Spending_Intensity = Total_Trans_Amt / Total_Trans_Ct";
            case "Engagement_Score" -> "Engagement_Score = Total_Trans_Ct / Months_on_book";
            case "Customer_Value_Score" -> "Customer_Value_Score = 0.4*z(Total_Trans_Amt) + 0.3*z(Credit_Limit) + 0.2*z(Months_on_book) - 0.1*z(Months_Inactive_12_mon)";
            case "Risk_Score" -> "Risk_Score = 0.4*Utilization_Score + 0.3*(Months_Inactive_12_mon/12) + 0.3*(1 - Engagement_norm)";
            case "Customer_Tier" -> "Customer_Tier = quartile bins of Customer_Value_Score (Bronze, Silver, Gold, Platinum)";
            default -> null;
        };
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

    private static String csvValue(String[] row, Map<String, Integer> indexes, String column) {
        Integer index = indexes.get(column);
        if (index == null || index >= row.length) {
            throw new IllegalArgumentException("Missing CSV column '" + column + "'");
        }
        return row[index].trim();
    }

    private static Double csvDouble(String[] row, Map<String, Integer> indexes, String column) {
        String value = csvValue(row, indexes, column);
        return value.isBlank() ? null : Double.valueOf(value);
    }

    private static Double numberOrNull(JsonNode node, String field) {
        return node == null || !node.has(field) || !node.path(field).isNumber()
                ? null : node.path(field).asDouble();
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
