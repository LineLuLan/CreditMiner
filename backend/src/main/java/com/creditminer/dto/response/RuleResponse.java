package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RuleResponse {
    private long ruleId;
    private String lhs;
    private String rhs;
    private double support;
    private double confidence;
    private double lift;
    /** {@code "churn"} or {@code "retention"}. */
    private String category;
}
