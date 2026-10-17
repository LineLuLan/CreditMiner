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
    private String binning;
    private List<String> notes;
    private List<String> categories;
    private List<Integer> counts;

    /** Additive alias; existing clients continue to use binEdges. */
    public List<Double> getEdges() {
        return binEdges;
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    private SummaryStats stats;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    private List<Series> series;

    @Data
    @Builder
    public static class SummaryStats {
        private int count;
        private double mean;
        private double std;
        private double min;
        private double q1;
        private double median;
        private double q3;
        private double max;
    }

    @Data
    @Builder
    public static class Series {
        private String label;
        private List<Integer> counts;

        @JsonInclude(JsonInclude.Include.ALWAYS)
        private SummaryStats stats;
    }
}
