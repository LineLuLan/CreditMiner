package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Response for {@code GET /api/overview}.
 */
@Data
@Builder
public class OverviewResponse {
    private long totalCustomers;
    private long attritedCount;
    private double churnRate;
    private double avgRiskScore;
    private double avgUtilization;

    /** Map: tier name -> customer count (Bronze/Silver/Gold/Platinum). */
    private Map<String, Long> tierBreakdown;
}
