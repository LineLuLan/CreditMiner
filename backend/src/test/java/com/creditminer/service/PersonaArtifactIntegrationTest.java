package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.request.PredictRequest;
import com.creditminer.entity.Cluster;
import com.creditminer.entity.Customer;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.repository.PredictionLogRepository;
import com.creditminer.repository.RuleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import weka.core.Instance;
import weka.core.Instances;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Real artifact readers and inference; all persistence is captured by repository mocks. */
class PersonaArtifactIntegrationTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void seedsEveryArtifactPersonaAndCustomerThenPredictsItsAssignedPersona() throws Exception {
        JsonNode personas = read("data/processed/phase6_clusters.json");
        JsonNode points = read("data/processed/phase6_pca_2d.json").path("points");
        assertThat(personas.isArray()).isTrue();
        assertThat(personas.size()).isPositive();
        Map<Integer, JsonNode> expectedPersonas = new LinkedHashMap<>();
        for (JsonNode persona : personas) {
            assertThat(persona.path("personaName").asText()).isNotBlank();
            assertThat(expectedPersonas.put(persona.path("clusterId").asInt(), persona)).isNull();
        }
        Map<Long, Integer> assignments = new LinkedHashMap<>();
        for (JsonNode point : points) {
            int clusterId = point.path("clusterId").asInt();
            assertThat(expectedPersonas).containsKey(clusterId);
            assertThat(assignments.put(point.path("clientId").asLong(), clusterId)).isNull();
        }

        CustomerRepository customerRepo = mock(CustomerRepository.class);
        ClusterRepository clusterRepo = mock(ClusterRepository.class);
        RuleRepository ruleRepo = mock(RuleRepository.class);
        List<Customer> savedCustomers = new ArrayList<>();
        Map<Integer, Cluster> savedClusters = new LinkedHashMap<>();
        when(customerRepo.saveAll(any())).thenAnswer(invocation -> {
            Iterable<Customer> batch = invocation.getArgument(0);
            List<Customer> snapshot = new ArrayList<>();
            batch.forEach(snapshot::add);
            savedCustomers.addAll(snapshot);
            return snapshot;
        });
        when(clusterRepo.saveAll(any())).thenAnswer(invocation -> {
            Iterable<Cluster> batch = invocation.getArgument(0);
            batch.forEach(cluster -> savedClusters.put(cluster.getClusterId(), cluster));
            return new ArrayList<>(savedClusters.values());
        });
        DataLoader loader = new DataLoader();
        DatabaseSeeder seeder = new DatabaseSeeder(customerRepo, clusterRepo, ruleRepo, loader,
                mock(ClusterService.class));
        ReflectionTestUtils.setField(seeder, "enrichedArffPath", "data/processed/enriched.arff");
        ReflectionTestUtils.setField(seeder, "clustersJsonPath", "data/processed/phase6_clusters.json");
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", "data/processed/phase6_pca_2d.json");
        ReflectionTestUtils.setField(seeder, "anomaliesJsonPath", "data/processed/phase6_anomalies.json");
        ReflectionTestUtils.setField(seeder, "rulesJsonPath", "models/rules.json");
        seeder.seed();

        assertThat(savedClusters.keySet()).isEqualTo(expectedPersonas.keySet());
        assertThat(savedCustomers).hasSize(assignments.size());
        assertThat(savedCustomers.stream().map(Customer::getClientId).distinct().count())
                .isEqualTo(assignments.size());
        Map<Integer, Long> actualCounts = savedCustomers.stream().collect(
                Collectors.groupingBy(Customer::getClusterId, Collectors.counting()));
        for (Customer customer : savedCustomers) {
            assertThat(customer.getClusterId()).as("cluster for client %s", customer.getClientId())
                    .isEqualTo(assignments.get(customer.getClientId()));
        }
        for (var entry : expectedPersonas.entrySet()) {
            Cluster saved = savedClusters.get(entry.getKey());
            assertThat(saved.getPersonaName()).isEqualTo(entry.getValue().path("personaName").asText());
            assertThat(saved.getSize()).isEqualTo(entry.getValue().path("size").asInt());
            assertThat(actualCounts.get(entry.getKey())).isEqualTo(saved.getSize().longValue());
        }
        verify(customerRepo).flush();

        // Intent: prove regenerated IDs survive real normalization and the prediction name lookup.
        // Status: one artifact-selected client per persona. Next: none. Blockers: none.
        // Confidence: every seeded assignment is checked above; sampled inference uses saved models.
        ModelConfig models = new ModelConfig();
        ReflectionTestUtils.setField(models, "classifierPath", "models/RANDOMFOREST_COST.model");
        ReflectionTestUtils.setField(models, "clustererPath", "models/kmeans.model");
        ReflectionTestUtils.setField(models, "clustererNormalizerPath", "models/kmeans-normalizer.model");
        ReflectionTestUtils.setField(models, "clustererInputHeaderPath", "models/kmeans-input-header.model");
        models.loadModels();
        assertThat(models.isReady()).isTrue();
        assertThat(models.getClustererNormalizer()).isNotNull();
        assertThat(models.getClustererInputHeader()).isNotNull();
        assertThat(models.getClusterer().numberOfClusters()).isEqualTo(expectedPersonas.size());

        PredictInputBuilder input = new PredictInputBuilder(loader);
        ReflectionTestUtils.setField(input, "enrichedArffPath", "data/processed/enriched.arff");
        input.init();
        assertThat(input.isReady()).isTrue();
        when(clusterRepo.findById(anyInt())).thenAnswer(invocation ->
                Optional.ofNullable(savedClusters.get(invocation.getArgument(0))));
        ClusteringService clustering = new ClusteringService(models);
        ClassificationService prediction = new ClassificationService(models, clustering, input,
                clusterRepo, mock(PredictionLogRepository.class));
        ReflectionTestUtils.setField(prediction, "featureImportancePath",
                "data/processed/phase5_feature_importance.json");
        Instances enriched = loader.loadArff("data/processed/enriched.arff");
        Map<Integer, Instance> representatives = new LinkedHashMap<>();
        for (Instance row : enriched) {
            int clusterId = assignments.get((long) row.value(enriched.attribute("ID")));
            representatives.putIfAbsent(clusterId, row);
        }
        assertThat(representatives.keySet()).isEqualTo(expectedPersonas.keySet());
        for (var entry : representatives.entrySet()) {
            assertThat(clustering.assignFromEnriched(entry.getValue()))
                    .as("serialized model assignment for persona %s", entry.getKey()).isEqualTo(entry.getKey());
            var result = prediction.predict(request(entry.getValue()));
            assertThat(result.getCluster()).as("prediction assignment for persona %s", entry.getKey())
                    .isEqualTo(entry.getKey());
            assertThat(result.getClusterName()).isEqualTo(savedClusters.get(entry.getKey()).getPersonaName());
            verify(clusterRepo).findById(entry.getKey());
        }
    }

    private JsonNode read(String path) throws Exception {
        return mapper.readTree(Path.of(path).toFile());
    }

    private static PredictRequest request(Instance row) {
        PredictRequest request = new PredictRequest();
        request.setLimitBal(BigDecimal.valueOf(row.value(row.dataset().attribute("LIMIT_BAL"))));
        request.setAge((int) row.value(row.dataset().attribute("AGE")));
        request.setSex(row.stringValue(row.dataset().attribute("SEX")));
        request.setEducation(row.stringValue(row.dataset().attribute("EDUCATION")));
        request.setMarriage(row.stringValue(row.dataset().attribute("MARRIAGE")));
        for (int month = 1; month <= 6; month++) {
            ReflectionTestUtils.setField(request, "pay" + month,
                    (int) row.value(row.dataset().attribute("PAY_" + month)));
            ReflectionTestUtils.setField(request, "billAmt" + month,
                    BigDecimal.valueOf(row.value(row.dataset().attribute("BILL_AMT" + month))));
            ReflectionTestUtils.setField(request, "payAmt" + month,
                    BigDecimal.valueOf(row.value(row.dataset().attribute("PAY_AMT" + month))));
        }
        return request;
    }
}
