package com.creditminer.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response for {@code POST /api/predict}.
 *
 * <p>See {@code docs/BE_Handoff.md §3.10} for the contract.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictResponse {

    /** Probability in {@code [0, 1]}. */
    private double churnProb;

    /** {@code "Existing"} or {@code "Attrited"}. */
    private String label;

    /** Composite risk score in {@code [0, 1]}. */
    private double riskScore;

    private int cluster;

    private String clusterName;

    private List<FeatureContribution> topFeatures;

    private String recommendation;

    /** Identifier of the model used (e.g. {@code "RandomForest_v1"}). */
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
