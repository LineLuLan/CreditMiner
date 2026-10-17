package com.creditminer.service;

import com.creditminer.dto.response.MiningReportResponse;
import com.creditminer.entity.Cluster;
import com.creditminer.repository.ClusterRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MiningReportServiceTest {
    private static final String PHASE1 = """
            {"schemaTransformations": {
              "renamedColumns": {"default payment next month":"Default","PAY_0":"PAY_1"},
              "mappingRules": {
                "EDUCATION":"1=Graduate, 2=University, 3=HighSchool, 0/4/5/6=Other",
                "MARRIAGE":"1=Married, 2=Single, 0/3=Other",
                "default payment next month":"0=No, 1=Yes",
                "SEX":"1=Male, 2=Female"
              },
              "educationSourceCodeCounts":{"0":14,"1":10585,"2":14030,"3":4917,"4":123,"5":280,"6":51},
              "marriageSourceCodeCounts":{"0":54,"1":13659,"2":15964,"3":323},
              "sexSourceCodeCounts":{"1":11888,"2":18112}
            }}
            """;

    @TempDir
    Path tempDir;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void executiveSummaryCountsAllArtifactRulesAndFamiliesByOutcome() throws Exception {
        JsonNode artifact = mapper.readTree(Path.of("models/rules.json").toFile());
        Map<List<String>, JsonNode> expected = new java.util.LinkedHashMap<>();
        for (String section : List.of("rules", "familyMembers")) {
            for (JsonNode rule : artifact.path(section)) expected.putIfAbsent(
                    List.of(rule.path("category").asText(), rule.path("lhs").asText(), rule.path("rhs").asText()), rule);
        }
        var repository = mock(com.creditminer.repository.RuleRepository.class);
        var service = new MiningReportService(null, null, repository, null, null, null, null, mapper, null);
        ReflectionTestUtils.setField(service, "rulesPath", "models/rules.json");
        List<String> warnings = new ArrayList<>();
        List<com.creditminer.dto.response.RuleResponse> rows = ReflectionTestUtils.invokeMethod(service, "loadReportRules", warnings);
        JsonNode summary = mapper.valueToTree(ReflectionTestUtils.invokeMethod(service, "ruleSummary", rows));
        assertThat(summary.path("ruleCount").asInt()).isEqualTo(expected.size()).isEqualTo(58);
        assertThat(summary.path("familyCount").asInt()).isEqualTo(20);
        for (String category : List.of("default", "non-default")) {
            String prefix = category.equals("default") ? "default" : "nonDefault";
            var outcome = expected.values().stream().filter(r -> r.path("category").asText().equals(category)).toList();
            long families = outcome.stream().map(r -> r.path("familyId").asText()).distinct().count();
            assertThat(summary.path(prefix + "RuleCount").asLong()).isEqualTo(outcome.size())
                    .isEqualTo(category.equals("default") ? 37 : 21);
            assertThat(summary.path(prefix + "FamilyCount").asLong()).isEqualTo(families).isEqualTo(10);
        }
        double max = expected.values().stream().mapToDouble(r -> r.path("lift").asDouble()).max().orElseThrow();
        assertThat(summary.path("topRuleLift").asDouble()).isEqualTo(Math.round(max * 100) / 100.0).isEqualTo(3.33);
        assertThat(summary.path("label").asText()).isEqualTo("58 rules in 20 families");
        MiningReportResponse.RulesEvidence evidence = ReflectionTestUtils.invokeMethod(service, "rules", rows);
        assertThat(evidence.getTotalRules()).isEqualTo(58);
        assertThat(evidence.getDefaultRules()).isEqualTo(37);
        assertThat(evidence.getNonDefaultRules()).isEqualTo(21);
        assertThat(evidence.getMaxLift()).isEqualTo(Math.round(max * 10000) / 10000.0);
        assertThat(evidence.getTopRules().get(0).getLift()).isEqualTo(max);
        assertThat(evidence.getTopRules().get(0).getLhsCount()).isEqualTo(563);
        assertThat(warnings).isEmpty();
        for (var field : MiningReportService.class.getDeclaredFields()) {
            if (field.isAnnotationPresent(org.springframework.beans.factory.annotation.Value.class)
                    && !field.getName().equals("rulesPath")) {
                ReflectionTestUtils.setField(service, field.getName(), tempDir.resolve("missing").toString());
            }
        }
        JsonNode reportSummary = mapper.valueToTree(service.report().getSummary());
        assertThat(reportSummary).isEqualTo(summary);
        verifyNoInteractions(repository);
        System.out.println("RESUME1_SUMMARY " + summary);
    }

    @Test
    void missingArtifactReportsOnlyPersistedCountsWithAnExplicitWarning() {
        var repository = mock(com.creditminer.repository.RuleRepository.class);
        when(repository.findAll()).thenReturn(List.of(com.creditminer.entity.Rule.builder()
                .lhs("PAY_1=2").rhs("Default=Yes").category("default")
                .support(java.math.BigDecimal.valueOf(.1)).confidence(java.math.BigDecimal.valueOf(.6))
                .lift(java.math.BigDecimal.valueOf(3)).build()));
        var service = new MiningReportService(null, null, repository, null, null, null, null, mapper, null);
        ReflectionTestUtils.setField(service, "rulesPath", tempDir.resolve("missing-rules.json").toString());
        List<String> warnings = new ArrayList<>();
        List<com.creditminer.dto.response.RuleResponse> rows = ReflectionTestUtils.invokeMethod(service, "loadReportRules", warnings);
        JsonNode summary = mapper.valueToTree(ReflectionTestUtils.invokeMethod(service, "ruleSummary", rows));
        assertThat(summary.path("ruleCount").asInt()).isEqualTo(1);
        assertThat(summary.path("familyCount").asInt()).isEqualTo(1);
        assertThat(summary.path("nonDefaultRuleCount").asInt()).isZero();
        assertThat(warnings).contains("Complete rule artifact unavailable; report counts cover persisted rules only.");
    }

    @Test
    void ruleUnionDeduplicatesWithinAnOutcomeButKeepsOppositeOutcomes() throws Exception {
        Path path = fixture("overlapping-rules.json", """
                {"baseline":{"totalRows":100,"defaultRate":0.2},
                 "rules":[{"lhs":"PAY_1=2","rhs":"Default=Yes","category":"default","lift":2},
                          {"lhs":"PAY_1=2","rhs":"Default=No","category":"non-default","lift":1}],
                 "familyMembers":[{"lhs":"PAY_1=2","rhs":"Default=Yes","category":"default","lift":2},
                                  {"lhs":"PAY_1=2, AGE=40-49","rhs":"Default=Yes","category":"default","lift":3}]}
                """);
        var service = new MiningReportService(null, null, null, null, null, null, null, mapper, null);
        ReflectionTestUtils.setField(service, "rulesPath", path.toString());
        List<com.creditminer.dto.response.RuleResponse> rows = ReflectionTestUtils.invokeMethod(service, "loadReportRules", new ArrayList<String>());
        JsonNode summary = mapper.valueToTree(ReflectionTestUtils.invokeMethod(service, "ruleSummary", rows));
        assertThat(summary.path("ruleCount").asInt()).isEqualTo(3);
        assertThat(summary.path("familyCount").asInt()).isEqualTo(2);
        assertThat(summary.path("defaultRuleCount").asInt()).isEqualTo(2);
        assertThat(summary.path("nonDefaultRuleCount").asInt()).isEqualTo(1);
        assertThat(summary.path("topRuleLift").asDouble()).isEqualTo(3);
    }

    @Test
    void associationSupportFallsBackToPassMinimumButPreservesExplicitFinalSupport() throws Exception {
        MiningReportService service = new MiningReportService(null, null, null, null, null, null, null, mapper, null);
        for (double support : List.of(.01, .02)) {
            MiningReportResponse.AssociationPass pass = ReflectionTestUtils.invokeMethod(service,
                    "associationPass", mapper.readTree("{\"minSupport\":" + support + "}"));
            assertThat(pass.getFinalSupport()).isEqualTo(support);
        }
        MiningReportResponse.AssociationPass explicit = ReflectionTestUtils.invokeMethod(service,
                "associationPass", mapper.readTree("{\"minSupport\":0.01,\"finalSupport\":0.015}"));
        assertThat(explicit.getFinalSupport()).isEqualTo(.015);
    }

    @Test
    void derivesUndocumentedCountsAndMappingRulesFromPhase1() throws Exception {
        var result = preprocessing(fixture("phase1.json", PHASE1), fixture("phase2.json", "{}"), new ArrayList<>());

        assertThat(result.getUnknownRewritten()).isEqualTo(Map.of("EDUCATION", 345, "MARRIAGE", 54));
        JsonNode json = mapper.valueToTree(result);
        assertThat(json.path("categoryMappingRules").path("EDUCATION").asText())
                .isEqualTo("1=Graduate, 2=University, 3=HighSchool, 0/4/5/6=Other");
        assertThat(json.path("categoryMappingRules").path("Default").asText()).isEqualTo("0=No, 1=Yes");
        assertThat(json.path("categoryMappingRules").has("default payment next month")).isFalse();
        assertThat(json.path("renamedColumns").path("PAY_0").asText()).isEqualTo("PAY_1");
        List<String> columns = new ArrayList<>();
        json.path("categoryMappingRules").fieldNames().forEachRemaining(columns::add);
        assertThat(columns).containsExactly("EDUCATION", "MARRIAGE", "Default", "SEX");
    }

    @Test
    void phase2EntriesTakePrecedenceOverPhase1Derivation() throws Exception {
        var result = preprocessing(fixture("phase1.json", PHASE1),
                fixture("phase2.json", "{\"unknownRewritten\":{\"EDUCATION\":7}}"), new ArrayList<>());

        assertThat(result.getUnknownRewritten()).isEqualTo(Map.of("EDUCATION", 7));
    }

    @Test
    void emptyPhase2CountsFallBackAndUndocumentedSexCodesAreCounted() throws Exception {
        String phase1 = PHASE1.replace("\"sexSourceCodeCounts\":{", "\"sexSourceCodeCounts\":{\"0\":2,");
        var result = preprocessing(fixture("phase1.json", phase1),
                fixture("phase2.json", "{\"unknownRewritten\":{}}"), new ArrayList<>());

        assertThat(result.getUnknownRewritten()).isEqualTo(Map.of("EDUCATION", 345, "MARRIAGE", 54, "SEX", 2));
    }

    @Test
    void missingPhase1LeavesMappingEvidenceEmptyAndRecordsWarning() throws Exception {
        List<String> warnings = new ArrayList<>();
        var result = preprocessing(tempDir.resolve("missing.json"), fixture("phase2.json", "{}"), warnings);

        JsonNode json = mapper.valueToTree(result);
        assertThat(json.path("categoryMappingRules").isObject()).isTrue();
        assertThat(json.path("categoryMappingRules").size()).isZero();
        assertThat(json.path("renamedColumns").isObject()).isTrue();
        assertThat(json.path("renamedColumns").size()).isZero();
        assertThat(result.getUnknownRewritten()).isEmpty();
        assertThat(warnings).anyMatch(warning -> warning.startsWith("phase1 describe JSON missing at "));
    }

    @Test
    void realArtifactsExposePreprocessingEvidence() throws Exception {
        List<String> warnings = new ArrayList<>();
        var result = preprocessing(Path.of("data/processed/phase1_describe.json"),
                Path.of("data/processed/phase2_report.json"), warnings);

        assertThat(warnings).isEmpty();
        assertThat(result.getUnknownRewritten()).isEqualTo(Map.of("EDUCATION", 345, "MARRIAGE", 54));
        assertThat(result.getNumericMedianImputed()).isEmpty();
        System.out.println("A4_PREPROCESSING_JSON=" + mapper.writeValueAsString(result));
    }

    @Test
    void enrichesDatabaseAndFallbackClustersWithRealSelectionEvidence() throws Exception {
        JsonNode artifact = mapper.readTree(Path.of("data/processed/phase6_clusters.json").toFile());
        JsonNode elbow = mapper.readTree(Path.of("data/processed/phase6_elbow.json").toFile());
        List<Cluster> persisted = new ArrayList<>();
        for (JsonNode row : artifact) persisted.add(Cluster.builder()
                .clusterId(row.path("clusterId").asInt()).personaName("Stored legacy name")
                .size(row.path("size").asInt()).centroidJson(row.path("centroid").toString())
                .defaultRate(row.path("defaultRate").decimalValue()).build());
        for (boolean fallback : List.of(false, true)) {
            ClusterRepository repository = mock(ClusterRepository.class);
            when(repository.findAll()).thenReturn(fallback ? List.of() : persisted);
            ClusterService profiles = profileService();
            MiningReportService service = clusteringService(repository, profiles, "data/processed/phase6_elbow.json");
            List<String> warnings = new ArrayList<>();
            MiningReportResponse.ClusteringEvidence result = ReflectionTestUtils.invokeMethod(service, "clustering", warnings);
            JsonNode selection = mapper.valueToTree(result).path("selection");
            assertThat(result.getClusters()).hasSize(artifact.size()).allSatisfy(cluster -> {
                String artifactName = artifact.get(cluster.getClusterId()).path("displayName").asText();
                assertThat(cluster.getDisplayName()).isNotBlank().isEqualTo(artifactName);
                assertThat(cluster.getPersonaName()).isEqualTo(fallback ? artifactName : "Stored legacy name");
                assertThat(cluster.getTagline()).isNotBlank();
                assertThat(cluster.getShareOfClients()).isNotNull().isBetween(0.0, 1.0);
                assertThat(cluster.getShareOfDefaults()).isNotNull().isBetween(0.0, 1.0);
                assertThat(cluster.getDefaultRateMultiplier()).isNotNull().isPositive();
                assertThat(cluster.getBaseline()).isNotNull();
                assertThat(cluster.getBaseline().getSize()).isEqualTo(29965);
                assertThat(cluster.getCentroidDelta()).isNotNull().hasSize(ClusteringService.CLUSTER_FEATURES.size());
                assertThat(cluster.getTraits()).isNotNull().hasSize(3);
                assertThat(cluster.getEvidence()).isNotNull();
                assertThat(cluster.getEvidence().getK()).isEqualTo(selection.path("chosenK").asInt());
                assertThat(cluster.getEvidence().getSilhouette()).isEqualTo(elbow.path("finalSilhouette").asDouble());
            });
            assertThat(selection.size()).isEqualTo(9);
            for (String field : List.of("bestKBySilhouette", "chosenK", "chosenReason", "initialization",
                    "restarts", "chosenSeed", "chosenWcss", "finalSilhouette", "sweepInitialization"))
                assertThat(selection.path(field)).as(field).isEqualTo(elbow.path(field));
            assertThat((JsonNode) mapper.valueToTree(result.getElbowScores())).isEqualTo(elbow.path("scores"));
            MiningReportResponse.ClusteringMethodology methodology = ReflectionTestUtils.invokeMethod(service,
                    "clusteringMethodology", warnings);
            JsonNode method = mapper.valueToTree(methodology);
            assertThat(method.path("seed")).isEqualTo(selection.path("chosenSeed"));
            assertThat(method.path("restarts")).isEqualTo(selection.path("restarts"));
            assertThat(method.path("initialization")).isEqualTo(selection.path("initialization"));
            assertThat(method.path("finalSilhouette")).isEqualTo(selection.path("finalSilhouette"));
            verify(profiles).enrich(result.getClusters());
            if (fallback) assertThat(warnings).containsExactly("Cluster DB summary empty; using phase6_clusters.json fallback.");
            else assertThat(warnings).isEmpty();
            System.out.println("REPORT_CLUSTER_SELECTION fallback=" + fallback + " " + selection);
        }
    }

    @Test
    void missingSelectionEvidenceDoesNotInventTrainingParameters() throws Exception {
        Path legacy = fixture("legacy-elbow.json", "{\"bestK\":4,\"scores\":[]}");
        MiningReportService service = clusteringService(mock(ClusterRepository.class), mock(ClusterService.class),
                legacy.toString());
        for (String path : List.of(legacy.toString(), tempDir.resolve("missing-elbow.json").toString())) {
            ReflectionTestUtils.setField(service, "elbowPath", path);
            MiningReportResponse.ClusteringMethodology methodology = ReflectionTestUtils.invokeMethod(service,
                    "clusteringMethodology", new ArrayList<String>());
            JsonNode method = mapper.valueToTree(methodology);
            for (String field : List.of("seed", "restarts", "initialization", "finalSilhouette"))
                assertThat(method.path(field).isNull()).as(field).isTrue();
        }
    }

    @Test
    void enrichmentFailurePreservesArtifactMetadataAndAddsWarning() {
        ClusterRepository repository = mock(ClusterRepository.class);
        when(repository.findAll()).thenReturn(List.of());
        ClusterService profiles = mock(ClusterService.class);
        when(profiles.enrich(anyList())).thenThrow(new IllegalStateException("aggregate unavailable"));
        MiningReportService service = clusteringService(repository, profiles, "data/processed/phase6_elbow.json");
        List<String> warnings = new ArrayList<>();
        MiningReportResponse.ClusteringEvidence result = ReflectionTestUtils.invokeMethod(service, "clustering", warnings);
        assertThat(result.getClusters()).hasSize(4).allSatisfy(cluster -> {
            assertThat(cluster.getDisplayName()).isNotBlank();
            assertThat(cluster.getTagline()).isNotBlank();
            assertThat(cluster.getGeneratedAt()).isNotBlank();
        });
        assertThat(warnings).contains("Cluster profile enrichment unavailable: aggregate unavailable");
        assertThat(result.getSelection().path("chosenK").asInt()).isEqualTo(4);
    }

    private ClusterService profileService() throws Exception {
        EntityManager entityManager = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(entityManager.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        // Local mock cohort repeats each real centroid by its cluster size; no database is queried.
        JsonNode clusters = mapper.readTree(Path.of("data/processed/phase6_clusters.json").toFile());
        long total = 0;
        double defaults = 0;
        for (JsonNode cluster : clusters) {
            total += cluster.path("size").asLong();
            defaults += cluster.path("size").asLong() * cluster.path("defaultRate").asDouble();
        }
        Object[] aggregate = new Object[3 + 2 * ClusteringService.CLUSTER_FEATURES.size()];
        aggregate[0] = total;
        aggregate[1] = Math.round(defaults);
        for (int i = 0; i < ClusteringService.CLUSTER_FEATURES.size(); i++) {
            double sum = 0, squares = 0;
            for (JsonNode cluster : clusters) {
                double value = cluster.path("centroid").path(ClusteringService.CLUSTER_FEATURES.get(i)).asDouble();
                long size = cluster.path("size").asLong();
                sum += size * value;
                squares += size * value * value;
            }
            aggregate[2 + 2 * i] = sum / total;
            aggregate[3 + 2 * i] = squares / total;
        }
        when(query.getSingleResult()).thenReturn(aggregate);
        ClusterService profiles = spy(new ClusterService(entityManager, mapper));
        ReflectionTestUtils.setField(profiles, "elbowPath", "data/processed/phase6_elbow.json");
        return profiles;
    }

    private MiningReportService clusteringService(ClusterRepository repository, ClusterService profiles, String elbowPath) {
        MiningReportService service = new MiningReportService(null, repository, null, null, null, null, null, mapper, profiles);
        ReflectionTestUtils.setField(service, "clustersPath", "data/processed/phase6_clusters.json");
        ReflectionTestUtils.setField(service, "elbowPath", elbowPath);
        ReflectionTestUtils.setField(service, "kmeansInputHeaderPath", "models/kmeans-input-header.model");
        return service;
    }

    private Path fixture(String name, String json) throws Exception {
        return Files.writeString(tempDir.resolve(name), json);
    }

    private MiningReportResponse.PreprocessingMethodology preprocessing(Path phase1, Path phase2,
                                                                       List<String> warnings) {
        MiningReportService service = new MiningReportService(null, null, null, null, null, null, null, mapper, null);
        ReflectionTestUtils.setField(service, "phase1DescribePath", phase1.toString());
        ReflectionTestUtils.setField(service, "phase2ReportPath", phase2.toString());
        return ReflectionTestUtils.invokeMethod(service, "preprocessingMethodology", warnings);
    }
}
