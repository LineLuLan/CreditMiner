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
                assertThat(bar.path("highlight").asBoolean()).isEqualTo(bar.path("value").asDouble() / baseline >= 1.15);
                System.out.printf(java.util.Locale.ROOT, "WAVE7_HIGHLIGHT %s | %s | %.1f | %.3f | %s%n",
                        visual.path("title").asText(), bar.path("label").asText(), bar.path("value").asDouble(),
                        bar.path("value").asDouble() / baseline, bar.path("highlight").asBoolean());
                assertThat(rateBuckets).anySatisfy(bucket -> {
                    int count = bucket.path("count").asInt(bucket.path("size").asInt());
                    assertThat(bar.path("n").asInt()).isEqualTo(count);
                    double percentage = Math.round(1000.0 * bucket.path("defaults").asInt() / count) / 10.0;
                    assertThat(bar.path("value").asDouble()).isEqualTo(percentage);
                });
            }
        }

        // The headline is the 3+ cohort; the chart now shows every late-month cohort.
        for (JsonNode visual : visuals) {
            if (!visual.path("title").asText().equals("Each late month adds risk")) continue;
            int clients = 0;
            for (JsonNode bar : visual.path("bars")) {
                clients += bar.path("n").asInt();
                if (bar.path("label").asText().equals("3+ late months"))
                    assertThat(bar.path("n").asInt()).isEqualTo(3743);
            }
            assertThat(clients).isEqualTo(facts.path("overall").path("rows").asInt());
        }
    }

    @Test
    void visualLabelsAndPersonaHeadlineMatchCurrentFacts() throws Exception {
        var mapper = new ObjectMapper();
        JsonNode visuals = new InsightService(mock(InsightRepository.class), mapper).visuals();
        JsonNode facts = mapper.readTree(new java.io.File("data/processed/phase9_insight_facts.json"));
        assertThat(visuals.get(0).path("bars")).hasSize(6);
        assertThat(visuals.get(0).path("bars").get(5).path("label").asText()).isEqualTo("3+ months late");
        assertThat(visuals.get(0).path("axis").asText())
                .isEqualTo("Repayment status on the latest statement (September 2005)");
        assertLabels(visuals.get(1), "0% or below (no balance)", "0-25%", "25-50%", "50-100%", "> 100%");
        assertThat(visuals.get(0).path("headline").path("factId").asText()).isEqualTo("default-rate-pay1-late2plus");
        assertThat(visuals.get(0).path("headline").path("value").asText()).isEqualTo("69.5%");
        assertThat(visuals.get(1).path("headline").path("factId").asText()).isEqualTo("default-rate-avg-utilization-le0");
        assertThat(visuals.get(1).path("bars").get(1).path("value").asDouble()).isEqualTo(16.6);
        try (InputStream in = new ClassPathResource("insights.json").getInputStream()) {
            assertThat(mapper.readTree(in).get(1).path("evidence").asText()).contains("16.6% at 0-25%");
        }
        assertLabels(visuals.get(8), "Graduate school", "University", "High school", "Other education",
                "Married", "Single", "Other status", "Male", "Female");
        assertLabels(visuals.get(2), "No late months", "1 late month", "2 late months", "3+ late months");
        assertLabels(visuals.get(4), "Q1: <= NT$50,000", "Q2: NT$50,000-140,000",
                "Q3: NT$140,000-240,000", "Q4: > NT$240,000");
        assertLabels(visuals.get(5), "Q1: <= NT$1,000", "Q2: NT$1,000-2,102",
                "Q3: NT$2,102-5,008", "Q4: > NT$5,008");
        assertLabels(visuals.get(6), "Q1: pays <= 4.1%", "Q2: 4.1-8.8%", "Q3: 8.8-61.1%", "Q4: > 61.1%");
        assertThat(visuals.get(8).path("headline").path("value").asText()).isEqualTo("25.2%");
        assertThat(visuals.get(8).path("headline").path("label").asText())
                .isEqualTo("default for high-school clients vs 19.2% graduate school");
        JsonNode personaVisual = visuals.get(3);
        assertThat(personaVisual.path("lift").asText()).isEmpty();
        assertThat(personaVisual.path("axis").asText()).isEqualTo("K-means persona (k = " + facts.path("byCluster").size() + ")");
        assertThat(personaVisual.path("bars")).hasSize(facts.path("byCluster").size());
        assertThat(personaVisual.path("headline").path("factId").asText()).isEqualTo("share-of-defaults-delayers");
        for (int i = 0; i < facts.path("byCluster").size(); i++) {
            assertThat(personaVisual.path("bars").get(i).path("label").asText())
                    .isEqualTo(facts.path("byCluster").get(i).path("personaName").asText());
        }
        double share = facts.path("personaFacts").get(0).path("value").asDouble();
        assertThat(personaVisual.path("headline").path("value").asText())
                .isEqualTo(String.format(java.util.Locale.ROOT, "%.1f%%", share * 100));
        double clientShare = 0;
        for (JsonNode fact : facts.path("personaFacts")) {
            if (fact.path("factId").asText().equals("share-of-clients-delayers"))
                clientShare = fact.path("value").asDouble();
        }
        assertThat(clientShare).isPositive();
        try (InputStream in = new ClassPathResource("insights.json").getInputStream()) {
            String evidence = mapper.readTree(in).get(3).path("evidence").asText();
            assertThat(evidence).contains(String.format(java.util.Locale.ROOT,
                    "they hold %.1fx their share of defaults", share / clientShare))
                    .contains("facts: share-of-defaults-delayers, share-of-clients-delayers");
        }
    }

    private void assertLabels(JsonNode visual, String... expected) {
        List<String> labels = new ArrayList<>();
        visual.path("bars").forEach(bar -> labels.add(bar.path("label").asText()));
        assertThat(labels).containsExactly(expected);
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
