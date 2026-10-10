package com.creditminer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Persisted UCI credit-card client record plus the Phase 3 derived features. */
@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {
    @Id
    @Column(name = "client_id")
    private Long clientId;

    @Column(name = "limit_bal", precision = 14, scale = 2)
    private BigDecimal limitBal;
    @Column(name = "sex", length = 10)
    private String sex;
    @Column(name = "education", length = 20)
    private String education;
    @Column(name = "marriage", length = 12)
    private String marriage;
    @Column(name = "age")
    private Integer age;

    @Column(name = "pay_1") private Integer pay1;
    @Column(name = "pay_2") private Integer pay2;
    @Column(name = "pay_3") private Integer pay3;
    @Column(name = "pay_4") private Integer pay4;
    @Column(name = "pay_5") private Integer pay5;
    @Column(name = "pay_6") private Integer pay6;

    @Column(name = "bill_amt1", precision = 14, scale = 2) private BigDecimal billAmt1;
    @Column(name = "bill_amt2", precision = 14, scale = 2) private BigDecimal billAmt2;
    @Column(name = "bill_amt3", precision = 14, scale = 2) private BigDecimal billAmt3;
    @Column(name = "bill_amt4", precision = 14, scale = 2) private BigDecimal billAmt4;
    @Column(name = "bill_amt5", precision = 14, scale = 2) private BigDecimal billAmt5;
    @Column(name = "bill_amt6", precision = 14, scale = 2) private BigDecimal billAmt6;

    @Column(name = "pay_amt1", precision = 14, scale = 2) private BigDecimal payAmt1;
    @Column(name = "pay_amt2", precision = 14, scale = 2) private BigDecimal payAmt2;
    @Column(name = "pay_amt3", precision = 14, scale = 2) private BigDecimal payAmt3;
    @Column(name = "pay_amt4", precision = 14, scale = 2) private BigDecimal payAmt4;
    @Column(name = "pay_amt5", precision = 14, scale = 2) private BigDecimal payAmt5;
    @Column(name = "pay_amt6", precision = 14, scale = 2) private BigDecimal payAmt6;

    @Column(name = "default_flag", length = 3)
    private String defaultFlag;
    @Column(name = "utilization_1", precision = 9, scale = 5)
    private BigDecimal utilization1;
    @Column(name = "avg_utilization", precision = 9, scale = 5)
    private BigDecimal avgUtilization;
    @Column(name = "pay_ratio", precision = 9, scale = 5)
    private BigDecimal payRatio;
    @Column(name = "months_delayed")
    private Integer monthsDelayed;
    @Column(name = "max_delay")
    private Integer maxDelay;
    @Column(name = "bill_trend", precision = 9, scale = 5)
    private BigDecimal billTrend;
    @Column(name = "risk_tier", length = 10)
    private String riskTier;

    @Column(name = "is_outlier")
    private Boolean isOutlier;
    @Column(name = "is_anomaly")
    private Boolean isAnomaly;
    @Column(name = "centroid_distance", precision = 8, scale = 4)
    private BigDecimal centroidDistance;
    @Column(name = "cluster_id")
    private Integer clusterId;
}
