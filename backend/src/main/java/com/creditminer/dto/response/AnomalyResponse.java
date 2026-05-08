package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnomalyResponse {
    private long clientNum;
    /** Comma-separated reasons (e.g. {@code "z-score, cluster-distance"}). */
    private String reason;
    private double score;
    private Integer clusterId;
}
