package com.creditminer.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Histogram response for a single column.
 * Numeric: {@code binEdges} has length n+1; {@code counts} has length n.
 * Nominal: {@code categories} has length k; {@code counts} has length k.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DistributionResponse {
    private String column;
    private String type;
    private List<Double> binEdges;
    private List<String> categories;
    private List<Integer> counts;
}
