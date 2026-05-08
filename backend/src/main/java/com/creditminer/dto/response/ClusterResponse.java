package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

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
    private double churnRate;
    private String description;
}
