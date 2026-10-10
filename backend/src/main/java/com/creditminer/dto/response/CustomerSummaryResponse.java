package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerSummaryResponse {
    private long clientId;
    private String defaultFlag;
    private Integer age;
    private String sex;
    private String education;
    private String riskTier;
    private Double payRatio;
    private Integer clusterId;
    private Boolean isOutlier;
    private Boolean isAnomaly;
}
