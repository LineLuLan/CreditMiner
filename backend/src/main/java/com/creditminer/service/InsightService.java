package com.creditminer.service;

import com.creditminer.dto.response.InsightResponse;
import com.creditminer.entity.Insight;
import com.creditminer.repository.InsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;

/**
 * Phase 8 — serve hand-crafted business insights stored in the
 * {@code insights} table (seeded from {@code resources/insights.json}).
 */
@Slf4j
@Service
public class InsightService {

    private final InsightRepository repo;
    private final JsonNode visuals;

    public InsightService(InsightRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.visuals = loadVisuals(mapper);
    }

    public List<InsightResponse> findAll() {
        return repo.findAllByOrderByPriorityAsc().stream().map(this::toDto).toList();
    }

    public List<InsightResponse> findByCategory(String category) {
        return repo.findByCategoryOrderByPriorityAsc(category).stream().map(this::toDto).toList();
    }

    public JsonNode visuals() {
        return visuals;
    }

    /*
     * Intent/status: load the static chart evidence once and cache it for read-only responses.
     * Next/blockers: none; malformed or missing resources degrade safely. Confidence: high.
     */
    private JsonNode loadVisuals(ObjectMapper mapper) {
        try (InputStream in = new ClassPathResource("insight-visuals.json").getInputStream()) {
            JsonNode loaded = mapper.readTree(in);
            if (loaded == null || !loaded.isArray()) {
                throw new IllegalArgumentException("resource root must be a JSON array");
            }
            return loaded;
        } catch (Exception ex) {
            log.warn("Failed to load insight-visuals.json; serving an empty array", ex);
            return mapper.createArrayNode();
        }
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
