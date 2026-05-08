package com.creditminer.service;

import com.creditminer.dto.response.InsightResponse;
import com.creditminer.entity.Insight;
import com.creditminer.repository.InsightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Phase 8 — serve hand-crafted business insights stored in the
 * {@code insights} table (seeded from {@code resources/insights.json}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InsightService {

    private final InsightRepository repo;

    public List<InsightResponse> findAll() {
        return repo.findAllByOrderByPriorityAsc().stream().map(this::toDto).toList();
    }

    public List<InsightResponse> findByCategory(String category) {
        return repo.findByCategoryOrderByPriorityAsc(category).stream().map(this::toDto).toList();
    }

    private InsightResponse toDto(Insight i) {
        return InsightResponse.builder()
                .insightId(i.getInsightId())
                .title(i.getTitle())
                .discovery(i.getDiscovery())
                .evidence(i.getEvidence())
                .recommendation(i.getRecommendation())
                .category(i.getCategory())
                .priority(i.getPriority() == null ? 1 : i.getPriority())
                .build();
    }
}
