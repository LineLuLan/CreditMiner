package com.creditminer.service;

import com.creditminer.repository.InsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class InsightServiceVisualsTest {

    @Test
    void returnsCachedInsightVisualsFromClasspath() {
        InsightService service = new InsightService(mock(InsightRepository.class), new ObjectMapper());

        JsonNode visuals = service.visuals();

        assertThat(visuals).hasSize(8);
        assertThat(visuals.path(0).path("headline").path("value").asText()).isNotBlank();
        assertThat(visuals.path(0).path("bars").isArray()).isTrue();
        assertThat(visuals.path(0).path("bars")).isNotEmpty();
        assertThat(service.visuals()).isSameAs(visuals);
    }
}
