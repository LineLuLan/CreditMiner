package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InsightResponse {
    private long insightId;
    private String title;
    private String discovery;
    private String evidence;
    private String recommendation;
    private String category;
    private int priority;
}
