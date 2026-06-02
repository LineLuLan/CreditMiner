package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Consolidated evidence payload for the Data Mining Report page.
 */
@Data
@Builder
public class MiningReportResponse {
    private Instant generatedAt;
    private DatasetEvidence dataset;
    private ClassificationEvidence classification;
    private ClusteringEvidence clustering;
    private RulesEvidence rules;
    private AnomalyEvidence anomalies;
    private List<InsightResponse> insights;
    private List<String> warnings;

    @Data
    @Builder
    public static class DatasetEvidence {
        private int totalRows;
        private int totalColumns;
        private String classColumn;
        private int numericColumns;
        private int categoricalColumns;
        private int totalMissingValues;
        private long dbCustomerRows;
        private long attritedCustomers;
        private double churnRate;
        private List<NameCount> attritionBreakdown;
        private List<ColumnMissing> topMissingColumns;
        private Map<String, Long> tierBreakdown;
        private List<String> leakageColumnsDropped;
    }

    @Data
    @Builder
    public static class ClassificationEvidence {
        private String bestModel;
        private String bestVariant;
        private String metricSource;
        private List<ModelMetric> modelMetrics;
        private List<FeatureImportance> featureImportance;
    }

    @Data
    @Builder
    public static class ClusteringEvidence {
        private int bestK;
        private String strategy;
        private int totalClusters;
        private List<ClusterResponse> clusters;
        private List<ElbowPoint> elbowScores;
    }

    @Data
    @Builder
    public static class RulesEvidence {
        private long totalRules;
        private long churnRules;
        private long retentionRules;
        private double avgSupport;
        private double avgConfidence;
        private double avgLift;
        private double minLift;
        private double maxLift;
        private List<RuleResponse> topRules;
    }

    @Data
    @Builder
    public static class AnomalyEvidence {
        private long dbOutlierCount;
        private long dbAnomalyCount;
        private Integer phase2OutlierCount;
        private Integer clusterStrongOutlierCount;
        private Integer clusterMildOutlierCount;
        private Integer combinedAnomalyCount;
        private Double combinedAnomalyPct;
        private Double clusterDistanceMu;
        private Double clusterDistanceSigma;
        private Double strongThreshold;
        private Double mildThreshold;
        private String rule;
        private List<AnomalyResponse> topAnomalies;
    }

    @Data
    @Builder
    public static class NameCount {
        private String name;
        private long count;
    }

    @Data
    @Builder
    public static class ColumnMissing {
        private String name;
        private int missing;
        private double missingPct;
    }

    @Data
    @Builder
    public static class ModelMetric {
        private String model;
        private String variant;
        private Double testF1;
        private Double testRocAuc;
        private Double testPrAuc;
        private Double testAccuracy;
        private String source;
    }

    @Data
    @Builder
    public static class FeatureImportance {
        private String name;
        private double importance;
        private double share;
    }

    @Data
    @Builder
    public static class ElbowPoint {
        private int k;
        private double wcss;
        private double silhouette;
    }
}
