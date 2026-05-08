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

/**
 * Maps to the {@code customers} table — see {@code db/schema.sql}.
 *
 * <p>Combines:
 * <ul>
 *   <li>21 raw columns from BankChurners.csv (after dropping the 2 leakage cols)</li>
 *   <li>6 derived features computed by {@link com.creditminer.service.FeatureEngineer}</li>
 *   <li>Flags ({@code isOutlier}, {@code isAnomaly}, {@code clusterId}) populated by
 *       the offline {@link com.creditminer.pipeline.TrainPipeline}</li>
 * </ul>
 * </p>
 */
@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @Column(name = "client_num")
    private Long clientNum;

    @Column(name = "attrition_flag", length = 20)
    private String attritionFlag;

    // ----- Demographics -----
    @Column(name = "customer_age")
    private Integer customerAge;

    @Column(name = "gender", length = 1)
    private String gender;

    @Column(name = "dependent_count")
    private Integer dependentCount;

    @Column(name = "education_level", length = 30)
    private String educationLevel;

    @Column(name = "marital_status", length = 20)
    private String maritalStatus;

    @Column(name = "income_category", length = 30)
    private String incomeCategory;

    // ----- Account -----
    @Column(name = "card_category", length = 20)
    private String cardCategory;

    @Column(name = "months_on_book")
    private Integer monthsOnBook;

    @Column(name = "total_relationship_count")
    private Integer totalRelationshipCount;

    @Column(name = "months_inactive_12_mon")
    private Integer monthsInactive12Mon;

    @Column(name = "contacts_count_12_mon")
    private Integer contactsCount12Mon;

    // ----- Financial -----
    @Column(name = "credit_limit", precision = 12, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "total_revolving_bal", precision = 12, scale = 2)
    private BigDecimal totalRevolvingBal;

    @Column(name = "avg_open_to_buy", precision = 12, scale = 2)
    private BigDecimal avgOpenToBuy;

    @Column(name = "avg_utilization_ratio", precision = 6, scale = 3)
    private BigDecimal avgUtilizationRatio;

    // ----- Transactional -----
    @Column(name = "total_amt_chng_q4_q1", precision = 8, scale = 3)
    private BigDecimal totalAmtChngQ4Q1;

    @Column(name = "total_trans_amt", precision = 12, scale = 2)
    private BigDecimal totalTransAmt;

    @Column(name = "total_trans_ct")
    private Integer totalTransCt;

    @Column(name = "total_ct_chng_q4_q1", precision = 8, scale = 3)
    private BigDecimal totalCtChngQ4Q1;

    // ----- Derived (Phase 3) -----
    @Column(name = "utilization_score", precision = 6, scale = 3)
    private BigDecimal utilizationScore;

    @Column(name = "spending_intensity", precision = 10, scale = 2)
    private BigDecimal spendingIntensity;

    @Column(name = "engagement_score", precision = 8, scale = 3)
    private BigDecimal engagementScore;

    @Column(name = "customer_value_score", precision = 8, scale = 3)
    private BigDecimal customerValueScore;

    @Column(name = "risk_score", precision = 6, scale = 3)
    private BigDecimal riskScore;

    @Column(name = "customer_tier", length = 15)
    private String customerTier;

    // ----- Flags -----
    @Column(name = "is_outlier")
    private Boolean isOutlier;

    @Column(name = "is_anomaly")
    private Boolean isAnomaly;

    @Column(name = "cluster_id")
    private Integer clusterId;
}
