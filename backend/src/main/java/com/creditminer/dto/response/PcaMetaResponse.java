package com.creditminer.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import java.util.List;

@Data
@Builder
public class PcaMetaResponse {
    private List<Double> explainedVariance;
    private List<Double> explainedVarianceOfTotal;
    private String explainedVarianceScope;
    private ZoomBounds zoomBounds;
    private long outsideCount;
    private int pointCount;

    @Data
    @Builder
    public static class ZoomBounds {
        @Getter(onMethod_ = @JsonProperty("xMin"))
        private double xMin;
        @Getter(onMethod_ = @JsonProperty("xMax"))
        private double xMax;
        @Getter(onMethod_ = @JsonProperty("yMin"))
        private double yMin;
        @Getter(onMethod_ = @JsonProperty("yMax"))
        private double yMax;
    }
}
