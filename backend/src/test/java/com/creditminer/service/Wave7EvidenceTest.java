package com.creditminer.service;

import com.creditminer.dto.response.ClusterResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import weka.core.Instances;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class Wave7EvidenceTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void exportedTotalVarianceSharesReachTheMetadataResponse() throws Exception {
        var service = new EdaService(mock(EdaDataCache.class));
        ReflectionTestUtils.setField(service, "pcaJsonPath", "data/processed/phase6_pca_2d.json");
        var meta = service.pcaMeta();
        assertThat(meta.getPointCount()).isEqualTo(29965);
        assertThat(meta.getExplainedVarianceOfTotal().get(0)).isCloseTo(.3763085902094014, within(1e-12));
        assertThat(meta.getExplainedVarianceOfTotal().get(1)).isCloseTo(.20425704579190887, within(1e-12));
        assertThat(meta.getExplainedVariance().stream().mapToDouble(Double::doubleValue).sum()).isCloseTo(1, within(1e-12));
        System.out.println("WAVE7_PCA_META " + mapper.writeValueAsString(meta));
    }

    @Test
    void headlineFactsUseExactCohortCounts() throws Exception {
        FactService service = new FactService(mapper);
        ReflectionTestUtils.setField(service, "factsPath", "data/processed/phase9_insight_facts.json");
        ReflectionTestUtils.setField(service, "evaluationPath", "data/processed/phase5_evaluation.json");
        var facts = service.get().getFacts();
        var rate = facts.stream().filter(f -> f.getFactId().equals("default-rate-pay1-late2plus")).findFirst().orElseThrow();
        assertThat(rate.getN()).isEqualTo(3129);
        assertThat(rate.getValue()).isEqualTo(2176. / 3129);
        assertThat(rate.getMultiplier()).isCloseTo(3.14, within(.005));
        var count = facts.stream().filter(f -> f.getFactId().equals("count-pay1-late2plus")).findFirst().orElseThrow();
        assertThat(count.getValue()).isEqualTo(3129.);
        JsonNode persisted = mapper.readTree(Path.of("data/processed/phase9_insight_facts.json").toFile()).path("repaymentFacts");
        assertThat(persisted.size()).isEqualTo(2);
        assertThat(persisted.get(0).path("value").asDouble()).isEqualTo(rate.getValue());
        assertThat(persisted.get(0).path("successes").asInt()).isEqualTo(2176);
        System.out.println("WAVE7_FACT " + mapper.writeValueAsString(rate));
        System.out.println("WAVE7_FACT " + mapper.writeValueAsString(count));
    }

    @Test
    void printsTraitsWithCustomerLevelClippingAndPreservesCentroids() throws Exception {
        Instances rows;
        try (var reader = Files.newBufferedReader(Path.of("data/processed/enriched.arff"))) {
            rows = new Instances(reader);
        }
        Map<Long, Integer> assignments = new HashMap<>();
        JsonNode pca = mapper.readTree(Path.of("data/processed/phase6_pca_2d.json").toFile());
        for (JsonNode point : pca.path("points")) assignments.put(point.path("clientId").asLong(), point.path("clusterId").asInt());
        Map<Integer, double[]> delayGroups = new HashMap<>();
        double[] sums = new double[8], squares = new double[8];
        double clippedSum = 0;
        long defaults = 0;
        for (var row : rows) {
            if (row.stringValue(rows.attribute("Default")).equals("Yes")) defaults++;
            for (int i = 0; i < 8; i++) {
                double value = row.value(rows.attribute(ClusteringService.CLUSTER_FEATURES.get(i)));
                sums[i] += value;
                squares[i] += value * value;
            }
            double delay = Math.max(0, row.value(rows.attribute("MAX_DELAY")));
            clippedSum += delay;
            double[] group = delayGroups.computeIfAbsent(assignments.get((long) row.value(rows.attribute("ID"))), ignored -> new double[2]);
            group[0] += delay;
            group[1]++;
        }
        Object[] aggregate = new Object[19];
        aggregate[0] = (long) rows.size();
        aggregate[1] = defaults;
        for (int i = 0; i < 8; i++) {
            aggregate[2 + 2 * i] = sums[i] / rows.size();
            aggregate[3 + 2 * i] = squares[i] / rows.size();
        }
        aggregate[18] = clippedSum / rows.size();
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        when(query.getSingleResult()).thenReturn(aggregate);
        List<Object[]> grouped = new ArrayList<>();
        delayGroups.forEach((id, values) -> grouped.add(new Object[]{id, values[0] / values[1]}));
        when(query.getResultList()).thenReturn(grouped);
        var service = new ClusterService(em, mapper);
        ReflectionTestUtils.setField(service, "elbowPath", "data/processed/phase6_elbow.json");
        JsonNode artifact = mapper.readTree(Path.of("data/processed/phase6_clusters.json").toFile());
        List<ClusterResponse> clusters = new ArrayList<>();
        for (JsonNode cluster : artifact) {
            Map<String, Double> centroid = new java.util.LinkedHashMap<>();
            cluster.path("centroid").fields().forEachRemaining(e -> centroid.put(e.getKey(), e.getValue().asDouble()));
            clusters.add(ClusterResponse.builder().clusterId(cluster.path("clusterId").asInt())
                    .size(cluster.path("size").asInt()).defaultRate(cluster.path("defaultRate").asDouble())
                    .centroid(Map.copyOf(centroid)).build());
        }
        service.enrich(clusters);
        assertThat(clusters).hasSize(4);
        for (var cluster : clusters) {
            double[] group = delayGroups.get(cluster.getClusterId());
            assertThat(cluster.getLongestDelayMonths()).isEqualTo(group[0] / group[1]);
            assertThat(cluster.getBaseline().getLongestDelayMonths()).isEqualTo(clippedSum / rows.size());
            assertThat(cluster.getTraits()).hasSize(3).allSatisfy(trait -> assertThat(trait).contains(": ", " vs "));
            if (cluster.getDisplayName().equals("Transactors")) {
                assertThat(cluster.getCentroid().get("MAX_DELAY")).isNegative();
                assertThat(cluster.getLongestDelayMonths()).isPositive();
                assertThat(cluster.getTagline()).isEqualTo("Pay bills in full, high limits");
            }
            System.out.println("WAVE7_CLUSTER " + mapper.writeValueAsString(cluster));
        }
    }
}
