package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/** Response for {@code GET /api/overview}. */
@Data
@Builder
public class OverviewResponse {
    private long totalCustomers;
    private long defaultCount;
    private double defaultRate;
    private double avgPayRatio;
    private double avgUtilization;
    private Map<String, Long> riskTierBreakdown;
}
