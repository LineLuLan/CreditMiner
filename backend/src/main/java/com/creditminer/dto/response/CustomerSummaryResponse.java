package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerSummaryResponse {
    private long clientNum;
    private String attritionFlag;
    private Integer customerAge;
    private String gender;
    private String cardCategory;
    private String customerTier;
    private Double riskScore;
    private Integer clusterId;
    private Boolean isOutlier;
    private Boolean isAnomaly;
}
