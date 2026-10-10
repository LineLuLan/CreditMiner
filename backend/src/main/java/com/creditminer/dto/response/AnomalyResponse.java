package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class AnomalyResponse {
    private long clientId;
    /** Signals that fired, e.g. {@code "cluster distance 0.6123 > strong threshold; IQR/Z outlier"}. */
    private String reason;
    /** Phase 6 distance from the assigned cluster centroid, rounded to four decimals. */
    private BigDecimal score;
    private Integer clusterId;
}
