package com.creditminer.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response for {@code POST /api/predict}.
 *
 * <p>See {@code docs/BE_Handoff.md \u00a73.10} for the contract.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictResponse {

    /** Probability in {@code [0, 1]}. */
    private double defaultProb;

    /** {@code "No"} or {@code "Yes"}. */
    private String label;

    /** Deterministic Phase 3 tier: {@code Low}, {@code Medium}, or {@code High}. */
    private String riskTier;

    private int cluster;

    private String clusterName;

    private List<FeatureContribution> topFeatures;

    /** Method behind the global feature ranking; not a per-client attribution. */
    private String importanceMethod;

    private String recommendation;

    /** Actual model-file stem (e.g. {@code "RANDOMFOREST_COST"}). */
    private String modelUsed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeatureContribution {
        private String name;
        /** Contribution share, summing to ~1.0 across {@code topFeatures}. */
        private double contribution;
    }
}
