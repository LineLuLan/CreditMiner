package com.creditminer.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Versioned evidence catalogue. Percent units carry fractions, not display percentages. */
@Value
@Builder
public class FactResponse {
    String version;
    String generatedAt;
    Baseline baseline;
    List<Fact> facts;

    @Value
    public static class Baseline {
        double defaultRate;
        int totalClients;
        int defaultCount;
    }

    @Value
    public static class ConfidenceInterval {
        double low;
        double high;
    }

    @Value
    @Builder
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public static class Fact {
        String factId;
        String label;
        Double value;
        String unit;
        Integer n;
        Double baseline;
        Double multiplier;
        ConfidenceInterval ci95;
        String definition;
        String source;
        String category;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        String name;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        Double importance;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        Double aucDrop;
    }
}
