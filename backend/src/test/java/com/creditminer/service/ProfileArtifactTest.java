package com.creditminer.service;

import com.creditminer.controller.ClusterController;
import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.entity.Cluster;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.sequence.SequencePattern;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import weka.core.Instances;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Read-only examples from current artifacts; database aggregate is simulated from enriched.arff. */
class ProfileArtifactTest {
    @Test
    void printsRealArtifactExamplesAndMeasuresWarmEnrichment() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        Instances data;
        try (var reader = Files.newBufferedReader(Path.of("data/processed/enriched.arff"))) {
            data = new Instances(reader);
        }
        Object[] aggregate = new Object[19];
        aggregate[0] = (long) data.numInstances();
        long defaults = 0;
        for (var row : data) if (row.stringValue(data.attribute("Default")).equals("Yes")) defaults++;
        aggregate[1] = defaults;
        for (int i = 0; i < ClusteringService.CLUSTER_FEATURES.size(); i++) {
            var feature = data.attribute(ClusteringService.CLUSTER_FEATURES.get(i));
            double sum = 0, squares = 0;
            long count = 0;
            for (var row : data) if (!row.isMissing(feature)) {
                double value = row.value(feature);
                sum += value;
                squares += value * value;
                count++;
            }
            aggregate[2 + 2 * i] = sum / count;
            aggregate[3 + 2 * i] = squares / count;
        }
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        when(query.getSingleResult()).thenReturn(aggregate);
        ClusterService clusters = new ClusterService(em, mapper);
        ReflectionTestUtils.setField(clusters, "elbowPath", "data/processed/phase6_elbow.json");
        List<Cluster> entities = new ArrayList<>();
        for (JsonNode row : mapper.readTree(new File("data/processed/phase6_clusters.json"))) {
            entities.add(Cluster.builder().clusterId(row.path("clusterId").asInt())
                    .personaName(row.path("personaName").asText()).size(row.path("size").asInt())
                    .centroidJson(row.path("centroid").toString())
                    .defaultRate(row.path("defaultRate").decimalValue()).avgRisk(row.path("avgRisk").decimalValue())
                    .description(row.path("description").asText()).build());
        }
        ClusterRepository repo = mock(ClusterRepository.class);
        when(repo.findAll()).thenReturn(entities);
        ClusterController controller = new ClusterController(repo, mock(CustomerRepository.class), clusters);
        List<ClusterResponse> profiles = controller.all();
        EdaService eda = new EdaService(mock(EdaDataCache.class));
        ReflectionTestUtils.setField(eda, "pcaJsonPath", "data/processed/phase6_pca_2d.json");
        long pcaStart = System.nanoTime();
        var meta = eda.pcaMeta();
        double pcaColdMs = (System.nanoTime() - pcaStart) / 1e6;
        SequenceService sequences = new SequenceService(mapper);
        ReflectionTestUtils.setField(sequences, "sequencesPath", "data/processed/phase10_sequences.json");
        long sequenceStart = System.nanoTime();
        JsonNode enriched = sequences.get();
        double sequenceColdMs = (System.nanoTime() - sequenceStart) / 1e6;
        int chosenK = mapper.readTree(new File("data/processed/phase6_elbow.json")).path("chosenK").asInt();
        assertThat(profiles).hasSize(chosenK);
        assertThat(profiles.get(0).getBaseline().getSize()).isEqualTo(29965);
        assertThat(meta.getPointCount()).isEqualTo(29965);
        assertThat(enriched.path("semanticsVersion").asInt()).isEqualTo(2);
        JsonNode stories = enriched.path("stories").path("defaultStories");
        assertThat(stories.size()).isEqualTo(5);
        for (JsonNode story : stories) {
            for (JsonNode other : stories) if (story != other) {
                assertThat(story.path("familyId").asText()).isNotEqualTo(other.path("familyId").asText());
            }
            String family = SequencePattern.parse(story.path("pattern").asText()).elements().stream()
                    .flatMap(java.util.Set::stream).distinct().sorted().collect(java.util.stream.Collectors.joining("|"));
            assertThat(story.path("familyId").asText()).isEqualTo(family);
        }
        // Check every pre-existing field in both top lists, rather than only the headline row.
        JsonNode original = mapper.readTree(new File("data/processed/phase10_sequences.json"));
        for (String group : List.of("topDefaultPatterns", "topNonDefaultPatterns")) {
            for (int i = 0; i < original.path(group).size(); i++) {
                JsonNode actual = enriched.path(group).get(i);
                original.path(group).get(i).fields().forEachRemaining(
                        field -> assertThat(actual.get(field.getKey())).isEqualTo(field.getValue()));
            }
        }
        double[] warm = new double[100];
        for (int i = 0; i < warm.length; i++) {
            long start = System.nanoTime();
            mapper.writeValueAsString(controller.all());
            mapper.writeValueAsString(eda.pcaMeta());
            mapper.writeValueAsString(sequences.get());
            warm[i] = (System.nanoTime() - start) / 1e6;
        }
        Arrays.sort(warm);
        System.out.println("5A3_CLUSTER_JSON=" + mapper.writeValueAsString(profiles.get(0)));
        System.out.println("5A3_PCA_META_JSON=" + mapper.writeValueAsString(meta));
        System.out.println("5A3_DEFAULT_STORIES_JSON=" + mapper.writeValueAsString(stories));
        System.out.printf(Locale.ROOT,
                "5A3_TIMING coldPcaMs=%.3f coldSequenceMs=%.3f warmCombinedP95Ms=%.3f warmCombinedMaxMs=%.3f%n",
                pcaColdMs, sequenceColdMs, warm[94], warm[99]);
        verify(query, times(1)).getSingleResult();
    }
}
