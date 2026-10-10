package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;
import java.util.List;

/**
 * Single-cluster summary returned in the {@code GET /api/clusters} array.
 */
@Data
@Builder
public class ClusterResponse {
    private int clusterId;
    private String personaName;
    private int size;
    /** Map: feature name -> centroid value. */
    private Map<String, Double> centroid;
    private double avgRisk;
    private double defaultRate;
    private String description;
    private String displayName;
    private Double shareOfClients;
    private Double shareOfDefaults;
    private Double defaultRateMultiplier;
    private Baseline baseline;
    private Map<String, Double> centroidDelta;
    private List<String> traits;
    private Evidence evidence;

    @Data
    @Builder
    public static class Baseline {
        private long size;
        private double defaultRate;
        private Map<String, Double> centroid;
    }

    @Data
    @Builder
    public static class Evidence {
        private int k;
        private Double silhouette;
        private String method;
    }
}
