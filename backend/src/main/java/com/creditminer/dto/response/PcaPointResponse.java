package com.creditminer.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Single PCA-2D point. Sourced from {@code data/processed/phase6_pca_2d.json}
 * (10127 customers × {clientNum, clusterId, x, y}). Served by
 * {@code GET /api/eda/pca-2d}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PcaPointResponse {
    private long clientNum;
    private int clusterId;
    private double x;
    private double y;
}
