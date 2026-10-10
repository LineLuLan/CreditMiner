package com.creditminer.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;

/** Raw UCI client attributes accepted by {@code POST /api/predict}. */
@Data
public class PredictRequest {
    @NotNull @DecimalMin(value = "1")
    private BigDecimal limitBal;

    @NotBlank @Pattern(regexp = "Male|Female")
    private String sex;

    @NotBlank @Pattern(regexp = "Graduate|University|HighSchool|Other")
    private String education;

    @NotBlank @Pattern(regexp = "Married|Single|Other")
    private String marriage;

    @NotNull @Min(18) @Max(100)
    private Integer age;

    @NotNull @Min(-2) @Max(9) private Integer pay1;
    @NotNull @Min(-2) @Max(9) private Integer pay2;
    @NotNull @Min(-2) @Max(9) private Integer pay3;
    @NotNull @Min(-2) @Max(9) private Integer pay4;
    @NotNull @Min(-2) @Max(9) private Integer pay5;
    @NotNull @Min(-2) @Max(9) private Integer pay6;

    @NotNull private BigDecimal billAmt1;
    @NotNull private BigDecimal billAmt2;
    @NotNull private BigDecimal billAmt3;
    @NotNull private BigDecimal billAmt4;
    @NotNull private BigDecimal billAmt5;
    @NotNull private BigDecimal billAmt6;

    @NotNull @DecimalMin("0") private BigDecimal payAmt1;
    @NotNull @DecimalMin("0") private BigDecimal payAmt2;
    @NotNull @DecimalMin("0") private BigDecimal payAmt3;
    @NotNull @DecimalMin("0") private BigDecimal payAmt4;
    @NotNull @DecimalMin("0") private BigDecimal payAmt5;
    @NotNull @DecimalMin("0") private BigDecimal payAmt6;
}
