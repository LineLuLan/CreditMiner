package com.creditminer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

/**
 * Pre-computed cluster summary written by the offline pipeline.
 * Matches {@code clusters} table.
 */
@Entity
@Table(name = "clusters")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cluster {

    @Id
    @Column(name = "cluster_id")
    private Integer clusterId;

    @Column(name = "persona_name", length = 50)
    private String personaName;

    @Column(name = "size")
    private Integer size;

    /** Centroid stored as JSONB for flexibility (variable feature set). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "centroid_json", columnDefinition = "jsonb")
    private String centroidJson;

    @Column(name = "avg_risk", precision = 6, scale = 3)
    private BigDecimal avgRisk;

    @Column(name = "churn_rate", precision = 6, scale = 3)
    private BigDecimal churnRate;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
