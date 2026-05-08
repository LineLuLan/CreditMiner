package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChurnGroupResponse {
    private String group;
    private int count;
    private int attritedCount;
    private double churnRate;
}
