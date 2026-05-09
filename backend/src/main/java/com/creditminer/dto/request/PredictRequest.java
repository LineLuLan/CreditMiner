package com.creditminer.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Body of {@code POST /api/predict}.
 *
 * <p>Mirrors the {@code PredictRequest} TypeScript interface in
 * {@code docs/BE_Handoff.md §4} and {@code web/src/lib/schemas.ts}.</p>
 *
 * <p>Validation is enforced via Bean Validation. Failures yield
 * {@code 400 VALIDATION_ERROR}.</p>
 */
@Data
public class PredictRequest {

    @NotNull @Min(18) @Max(100)
    private Integer customerAge;

    @NotBlank @Pattern(regexp = "M|F")
    private String gender;

    @NotNull @Min(0) @Max(10)
    private Integer dependentCount;

    @NotBlank
    private String educationLevel;

    @NotBlank
    private String maritalStatus;

    @NotBlank
    private String incomeCategory;

    @NotBlank @Pattern(regexp = "Blue|Silver|Gold|Platinum")
    private String cardCategory;

    @NotNull @Min(0)
    private Integer monthsOnBook;

    @NotNull @Min(1) @Max(10)
    private Integer totalRelationshipCount;

    @NotNull @Min(0) @Max(12)
    private Integer monthsInactive12Mon;

    @NotNull @Min(0) @Max(20)
    private Integer contactsCount12Mon;

    @NotNull @PositiveOrZero
    private BigDecimal creditLimit;

    @NotNull @PositiveOrZero
    private BigDecimal totalRevolvingBal;

    @NotNull @PositiveOrZero
    private BigDecimal totalTransAmt;

    @NotNull @Min(0)
    private Integer totalTransCt;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    @DecimalMax(value = "1.0", inclusive = true)
    private BigDecimal avgUtilizationRatio;

    /**
     * Quarter-over-quarter transaction amount ratio (Q4/Q1). Optional — when null,
     * {@link com.creditminer.service.PredictInputBuilder} substitutes 1.0
     * ("no change") so existing FE clients keep working.
     */
    @PositiveOrZero
    private BigDecimal totalAmtChngQ4Q1;

    /**
     * Quarter-over-quarter transaction count ratio (Q4/Q1). Same fallback as
     * {@link #totalAmtChngQ4Q1}.
     */
    @PositiveOrZero
    private BigDecimal totalCtChngQ4Q1;
}
