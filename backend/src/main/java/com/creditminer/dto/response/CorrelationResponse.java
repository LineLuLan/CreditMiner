package com.creditminer.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Pearson correlation matrix for the numeric features in the EDA dataset. */
@Data
@Builder
public class CorrelationResponse {
    private List<String> columns;
    private double[][] matrix;
}
