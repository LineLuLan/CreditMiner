package com.creditminer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hand-curated business insight in Discovery / Evidence / Recommendation form.
 * Loaded from {@code resources/insights.json} by the seeder; lives in
 * the {@code insights} table afterwards.
 */
@Entity
@Table(name = "insights")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Insight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "insight_id")
    private Long insightId;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "discovery", columnDefinition = "TEXT")
    private String discovery;

    @Column(name = "evidence", columnDefinition = "TEXT")
    private String evidence;

    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    /** {@code "churn"}, {@code "cluster"}, {@code "risk"}, or {@code "opportunity"}. */
    @Column(name = "category", length = 30)
    private String category;

    @Column(name = "priority")
    private Integer priority;
}
