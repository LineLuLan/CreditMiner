package com.creditminer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Output of Apriori (Phase 7). Sorted by lift desc.
 */
@Entity
@Table(name = "rules", indexes = {
        @Index(name = "idx_rules_lift", columnList = "lift DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "lhs", columnDefinition = "TEXT")
    private String lhs;

    @Column(name = "rhs", columnDefinition = "TEXT")
    private String rhs;

    @Column(name = "support", precision = 6, scale = 4)
    private BigDecimal support;

    @Column(name = "confidence", precision = 6, scale = 4)
    private BigDecimal confidence;

    @Column(name = "lift", precision = 8, scale = 4)
    private BigDecimal lift;

    /** {@code "churn"} or {@code "retention"} — derived from RHS in {@code AssociationService}. */
    @Column(name = "category", length = 30)
    private String category;
}
