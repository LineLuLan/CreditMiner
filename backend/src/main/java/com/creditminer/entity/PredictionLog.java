package com.creditminer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Audit log for every {@code POST /api/predict} call.
 * Used for analytics, A/B testing, and replay.
 */
@Entity
@Table(name = "predictions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prediction_id")
    private Long predictionId;

    @Column(name = "ts", nullable = false)
    private OffsetDateTime ts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_json", columnDefinition = "jsonb")
    private String inputJson;

    @Column(name = "predicted_label", length = 20)
    private String predictedLabel;

    @Column(name = "churn_prob", precision = 6, scale = 4)
    private BigDecimal churnProb;

    @Column(name = "cluster_id")
    private Integer clusterId;

    @Column(name = "model_used", length = 30)
    private String modelUsed;
}
