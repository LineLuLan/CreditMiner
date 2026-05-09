package com.creditminer.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * Per-column entry in the Phase 1 describe table.
 * Numeric-only and nominal-only fields are nullable; Jackson omits nulls.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ColumnStats {
    private String name;
    private String type;
    private int count;
    private int missing;
    private double missingPct;

    private Double mean;
    private Double std;
    private Double min;
    private Double max;
    private Double median;

    private Integer distinctCount;
    private String topValue;
    private Integer topCount;
}
