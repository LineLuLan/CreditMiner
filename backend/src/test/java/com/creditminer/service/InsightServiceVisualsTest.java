package com.creditminer.service;

import com.creditminer.repository.InsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InsightServiceVisualsTest {

    @Test
    void loadsCachedInsightVisualsMatchingAuthoredInsights() throws Exception {
        InsightRepository repository = mock(InsightRepository.class);
        when(repository.findAllByOrderByPriorityAsc()).thenReturn(List.of());
        ObjectMapper mapper = new ObjectMapper();
        InsightService service = new InsightService(repository, mapper);

        JsonNode visuals = service.visuals();
        JsonNode insights;
        try (InputStream in = new ClassPathResource("insights.json").getInputStream()) {
            insights = mapper.readTree(in);
        }

        assertThat(visuals.isArray()).isTrue();
        assertThat(visuals).hasSize(10);
        assertThat(insights).hasSize(10);
        assertThat(service.visuals()).isSameAs(visuals);

        // One chart per insight, matched by title and in the same order.
        List<String> insightTitles = new ArrayList<>();
        insights.forEach(n -> insightTitles.add(n.path("title").asText()));
        List<String> visualTitles = new ArrayList<>();
        visuals.forEach(n -> visualTitles.add(n.path("title").asText()));
        assertThat(visualTitles).isEqualTo(insightTitles);

        JsonNode facts = mapper.readTree(new java.io.File("data/processed/phase9_insight_facts.json"));
        double baseline = Math.round(1000.0 * facts.path("overall").path("defaults").asInt()
                / facts.path("overall").path("rows").asInt()) / 10.0;
        List<JsonNode> rateBuckets = new ArrayList<>();
        facts.path("defaultByBucket").forEach(dimension -> dimension.forEach(rateBuckets::add));
        facts.path("byCluster").forEach(rateBuckets::add);
        facts.path("combos").forEach(rateBuckets::add);
        for (JsonNode visual : visuals) {
            assertThat(visual.path("bars").isArray()).isTrue();
            assertThat(visual.path("bars").size()).isBetween(2, 12);
            assertThat(visual.path("baseline").path("value").asDouble()).isEqualTo(baseline);
            assertThat(visual.path("baseline").path("label").asText())
                    .isEqualTo(String.format(java.util.Locale.ROOT, "Portfolio %.1f%%", baseline));
            for (JsonNode bar : visual.path("bars")) {
                assertThat(bar.path("value").isNumber()).isTrue();
                assertThat(bar.path("n").asInt()).isPositive();
                assertThat(bar.path("highlight").asBoolean()).isEqualTo(bar.path("value").asDouble() > baseline);
                assertThat(rateBuckets).anySatisfy(bucket -> {
                    int count = bucket.path("count").asInt(bucket.path("size").asInt());
                    assertThat(bar.path("n").asInt()).isEqualTo(count);
                    double percentage = Math.round(1000.0 * bucket.path("defaults").asInt() / count) / 10.0;
                    assertThat(bar.path("value").asDouble()).isEqualTo(percentage);
                });
            }
        }

        // The unchanged web adapter sums highlighted bars for this headline cohort.
        for (JsonNode visual : visuals) {
            if (!visual.path("title").asText().equals("Each late month adds risk")) continue;
            int highlightedClients = 0;
            for (JsonNode bar : visual.path("bars")) {
                if (bar.path("highlight").asBoolean()) highlightedClients += bar.path("n").asInt();
            }
            assertThat(highlightedClients).isEqualTo(3743);
        }
    }

    @Test
    void demoSeederAcceptsEveryInsightWithoutDatabaseWrites() throws Exception {
        var repository = mock(InsightRepository.class);
        var initializer = new com.creditminer.config.DemoDataInitializer(
                mock(DatabaseSeeder.class), repository, new ObjectMapper());
        initializer.run(null);
        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<Iterable<com.creditminer.entity.Insight>> captured =
                org.mockito.ArgumentCaptor.forClass(Iterable.class);
        org.mockito.Mockito.verify(repository).saveAll(captured.capture());
        assertThat(captured.getValue()).hasSize(10).allSatisfy(row -> {
            assertThat(row.getTitle()).isNotBlank();
            assertThat(row.getDiscovery()).isNotBlank();
            assertThat(row.getEvidence()).contains("facts: ");
            assertThat(row.getRecommendation()).isNotBlank();
            assertThat(row.getCategory()).isIn("driver", "segment", "context");
            assertThat(row.getPriority()).isBetween(1, 10);
        });
    }

    @Test
    void everyInsightCitationResolvesToTheCatalogue() throws Exception {
        var mapper = new ObjectMapper();
        var service = new FactService(mapper);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "factsPath",
                "data/processed/phase9_insight_facts.json");
        org.springframework.test.util.ReflectionTestUtils.setField(service, "evaluationPath",
                "data/processed/phase5_evaluation.json");
        var ids = service.get().getFacts().stream().map(f -> f.getFactId()).toList();
        try (InputStream in = new ClassPathResource("insights.json").getInputStream()) {
            for (JsonNode insight : mapper.readTree(in)) {
                String evidence = insight.path("evidence").asText();
                assertThat(evidence).contains("facts: ");
                String citations = evidence.substring(evidence.indexOf("facts: ") + 7).replace(".", "");
                for (String id : citations.split(", ")) assertThat(ids).contains(id);
            }
        }
    }
}
