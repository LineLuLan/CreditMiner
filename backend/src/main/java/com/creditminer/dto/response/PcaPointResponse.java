package com.creditminer.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Single PCA-2D point. Sourced from {@code data/processed/phase6_pca_2d.json}
 * ({@code clientId}, {@code clusterId}, {@code x}, {@code y}). Served by
 * {@code GET /api/eda/pca-2d}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PcaPointResponse {
    private long clientId;
    private int clusterId;
    private double x;
    private double y;
}
