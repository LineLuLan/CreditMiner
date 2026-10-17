package com.creditminer.controller;

import com.creditminer.entity.Cluster;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.repository.RuleRepository;
import com.creditminer.service.ClusterService;
import com.creditminer.service.ClusteringService;
import com.creditminer.service.DataLoader;
import com.creditminer.service.DatabaseSeeder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ClusterControllerTest {
    @TempDir Path temp;

    @Test
    void exposesEverySeededArtifactPersonaAndFinalModelEvidence() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode personas = mapper.readTree(Path.of("data/processed/phase6_clusters.json").toFile());
        JsonNode elbow = mapper.readTree(Path.of("data/processed/phase6_elbow.json").toFile());
        assertThat(personas.size()).isPositive();
        assertThat(elbow.path("finalSilhouette").isNumber()).isTrue();
        List<Cluster> seeded = new ArrayList<>();
        ClusterRepository clusters = mock(ClusterRepository.class);
        CustomerRepository customers = mock(CustomerRepository.class);
        when(clusters.saveAll(any())).thenAnswer(invocation -> {
            Iterable<Cluster> rows = invocation.getArgument(0);
            rows.forEach(seeded::add);
            return seeded;
        });
        DatabaseSeeder seeder = new DatabaseSeeder(customers, clusters,
                mock(RuleRepository.class), new DataLoader(), mock(ClusterService.class));
        ReflectionTestUtils.setField(seeder, "enrichedArffPath", "data/processed/enriched.arff");
        ReflectionTestUtils.setField(seeder, "clustersJsonPath", "data/processed/phase6_clusters.json");
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", "data/processed/phase6_pca_2d.json");
        ReflectionTestUtils.setField(seeder, "anomaliesJsonPath", "data/processed/phase6_anomalies.json");
        ReflectionTestUtils.setField(seeder, "rulesJsonPath", "models/rules.json");
        seeder.seed();
        assertThat(seeded).hasSize(personas.size());
        when(clusters.findAll()).thenReturn(seeded);

        long total = seeded.stream().mapToLong(Cluster::getSize).sum();
        Object[] aggregates = new Object[3 + 2 * ClusteringService.CLUSTER_FEATURES.size()];
        aggregates[0] = total;
        aggregates[1] = seeded.stream().mapToDouble(c -> c.getSize() * c.getDefaultRate().doubleValue()).sum();
        Map<Integer, JsonNode> expected = new LinkedHashMap<>();
        for (JsonNode persona : personas) expected.put(persona.path("clusterId").asInt(), persona);
        for (int index = 0; index < ClusteringService.CLUSTER_FEATURES.size(); index++) {
            String feature = ClusteringService.CLUSTER_FEATURES.get(index);
            double mean = 0;
            double secondMoment = 0;
            for (JsonNode persona : personas) {
                double value = persona.path("centroid").path(feature).asDouble();
                mean += persona.path("size").asLong() * value / total;
                secondMoment += persona.path("size").asLong() * value * value / total;
            }
            aggregates[2 + 2 * index] = mean;
            aggregates[3 + 2 * index] = secondMoment;
        }
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        when(query.getSingleResult()).thenReturn(aggregates);
        ClusterService service = new ClusterService(em, mapper);
        ReflectionTestUtils.setField(service, "elbowPath", "data/processed/phase6_elbow.json");
        var mvc = MockMvcBuilders.standaloneSetup(new ClusterController(clusters, customers, service)).build();
        String body = mvc.perform(get("/api/clusters")).andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray()).andReturn().getResponse().getContentAsString();
        JsonNode response = mapper.readTree(body);
        assertThat(response.size()).isEqualTo(expected.size());
        for (JsonNode cluster : response) {
            int clusterId = cluster.path("clusterId").asInt();
            assertThat(expected).containsKey(clusterId);
            JsonNode persona = expected.remove(clusterId);
            assertThat(cluster.path("personaName").asText()).isEqualTo(persona.path("personaName").asText());
            assertThat(cluster.path("displayName").asText()).isEqualTo(persona.path("personaName").asText());
            assertThat(cluster.path("size").asInt()).isEqualTo(persona.path("size").asInt());
            assertThat(cluster.path("evidence").path("k").asInt()).isEqualTo(personas.size());
            assertThat(cluster.path("evidence").path("silhouette").asDouble())
                    .isEqualTo(elbow.path("finalSilhouette").asDouble());
        }
        assertThat(expected).isEmpty();
    }

    @Test
    void retainsArrayAndStoredFieldsWhileAddingPortfolioComparison() throws Exception {
        ClusterRepository clusters = mock(ClusterRepository.class);
        when(clusters.findAll()).thenReturn(List.of(cluster(0, 20, ".5", 3), cluster(1, 80, ".125", .5)));
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        when(query.getSingleResult()).thenReturn(new Object[]{100L, 20L,
                .4, .25, .4, .25, .4, .25, 1., 2., 1., 2., .1, .02, 100000., 2e10, 40., 1700., .7});
        when(query.getResultList()).thenReturn(List.of(new Object[]{0, 2.6}, new Object[]{1, .1}));
        ClusterService service = new ClusterService(em, new ObjectMapper());
        Path elbow = temp.resolve("elbow.json");
        Files.writeString(elbow, "{\"bestK\":2,\"strategy\":\"argmax silhouette\",\"scores\":[{\"k\":2,\"silhouette\":0.46}]}");
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());
        var mvc = MockMvcBuilders.standaloneSetup(new ClusterController(clusters,
                mock(CustomerRepository.class), service)).build();
        mvc.perform(get("/api/clusters"))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].personaName").value("Legacy persona"))
                .andExpect(jsonPath("$[0].displayName").value("Persistent delayers"))
                .andExpect(jsonPath("$[1].displayName").value("Revolvers, never late"))
                .andExpect(jsonPath("$[0].shareOfClients").value(.2))
                .andExpect(jsonPath("$[0].shareOfDefaults").value(.5))
                .andExpect(jsonPath("$[0].defaultRateMultiplier").value(2.5))
                .andExpect(jsonPath("$[0].baseline.size").value(100))
                .andExpect(jsonPath("$[0].longestDelayMonths").value(2.6))
                .andExpect(jsonPath("$[1].longestDelayMonths").value(.1))
                .andExpect(jsonPath("$[0].baseline.longestDelayMonths").value(.7))
                .andExpect(jsonPath("$[0].centroidDelta.MONTHS_DELAYED").value(2.0))
                .andExpect(jsonPath("$[0].traits[0]").value("Late months (of 6): 3.0 vs 1.0"))
                .andExpect(jsonPath("$[0].evidence.k").value(2))
                .andExpect(jsonPath("$[0].evidence.silhouette").doesNotExist())
                .andExpect(jsonPath("$[0].evidence.method").value("final-model silhouette unavailable"));
    }

    private Cluster cluster(int id, int size, String rate, double delay) {
        return Cluster.builder().clusterId(id).size(size).personaName("Legacy persona")
                .defaultRate(new BigDecimal(rate)).centroidJson("{\"MONTHS_DELAYED\":" + delay + ",\"PAY_RATIO\":0.3}").build();
    }
}
