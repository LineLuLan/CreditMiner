package com.creditminer.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private Methodology methodology;
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
        private EvaluationEvidence evaluation;
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
        private Double cvAccuracy;
        private Double cvF1;
        private Double cvRocAuc;
        private Double cvPrAuc;
        private Double testF1;
        private Double testRocAuc;
        private Double testPrAuc;
        private Double testAccuracy;
        private Double testPrecision;
        private Double testRecall;
        private String source;
    }

    @Data
    @Builder
    public static class EvaluationEvidence {
        private JsonNode split;
        private List<JsonNode> variants;
        private JsonNode bestVariant;
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

    @Data
    @Builder
    public static class Methodology {
        private PreprocessingMethodology preprocessing;
        private FeatureEngineeringMethodology featureEngineering;
        private JsonNode split;
        private ClusteringMethodology clustering;
        private AssociationMethodology associationRules;
        private AnomalyMethodology anomaly;
    }

    @Data
    @Builder
    public static class PreprocessingMethodology {
        private int rowsIn;
        private int rowsOut;
        private int duplicatesDropped;
        private Map<String, Integer> unknownRewritten;
        private Map<String, Double> numericMedianImputed;
        private Map<String, OutlierColumnMethodology> outlierByColumn;
        private List<String> leakageColumnsDropped;
        private String outlierPolicy;
    }

    @Data
    @Builder
    public static class OutlierColumnMethodology {
        private int zscoreCount;
        private int iqrCount;
        private int combinedCount;
        private double mean;
        private double std;
        private double q1;
        private double q3;
    }

    @Data
    @Builder
    public static class FeatureEngineeringMethodology {
        private int columnsIn;
        private int columnsOut;
        private List<DerivedFeatureMethodology> derivedFeatures;
    }

    @Data
    @Builder
    public static class DerivedFeatureMethodology {
        private String name;
        private String type;
        private Double mean;
        private Double std;
        private Double min;
        private Double max;
        private String formula;
    }

    @Data
    @Builder
    public static class ClusteringMethodology {
        @JsonProperty("kMin")
        private int kMin;
        @JsonProperty("kMax")
        private int kMax;
        private int bestK;
        private String strategy;
        private int seed;
        private int maxIterations;
        private String normalization;
        private List<String> featuresUsed;
        private List<ElbowPoint> elbow;
    }

    @Data
    @Builder
    public static class AssociationMethodology {
        private String discretization;
        private List<String> attributesUsed;
        private AssociationPass retentionPass;
        private AssociationPass churnPass;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AssociationPass {
        private Double minSupport;
        private Double minConfidence;
        private Double minLift;
        private Integer numRules;
        private String metric;
    }

    @Data
    @Builder
    public static class AnomalyMethodology {
        private String rule;
        private Double mu;
        private Double sigma;
        private Double strongThreshold;
        private Double mildThreshold;
    }
}
