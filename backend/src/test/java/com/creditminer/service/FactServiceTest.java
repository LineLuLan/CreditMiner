package com.creditminer.service;

import com.creditminer.dto.response.FactResponse;
import com.creditminer.dto.response.FactResponse.Fact;
import com.creditminer.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class FactServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    @TempDir Path temporaryDirectory;

    @Test
    void derivesExactRatesWilsonIntervalsAndCachesTheCatalogue() throws Exception {
        ObjectNode artifact = fixture();
        FactService service = service(artifact, evaluation());
        FactResponse result = service.get();
        Fact fact = find(result, "default-rate-pay1-late2");
        assertThat(result.getVersion()).isEqualTo("1.0.0");
        assertThat(result.getGeneratedAt()).isEqualTo("2026-10-10T00:00:00Z");
        assertThat(result.getBaseline().getDefaultRate()).isEqualTo(0.2);
        assertThat(fact.getValue()).isEqualTo(0.7);
        assertThat(fact.getN()).isEqualTo(10);
        assertThat(fact.getMultiplier()).isCloseTo(3.5, within(1e-12));
        assertThat(fact.getCi95().getLow()).isCloseTo(0.39677321997956516, within(1e-12));
        assertThat(fact.getCi95().getHigh()).isCloseTo(0.892210712513788, within(1e-12));
        assertThat(fact.getUnit()).isEqualTo("%");
        assertThat(fact.getSource()).contains("phase9_insight_facts.json", "$.defaultByBucket.PAY_1[0].defaults");
        assertThat(find(result, "share-of-clients-cluster-0").getValue()).isEqualTo(0.1);
        assertThat(find(result, "share-of-defaults-cluster-0").getValue()).isEqualTo(0.35);
        assertThat(find(result, "importance-top1").getAucDrop()).isEqualTo(0.03);
        assertThat(find(result, "selected-model-cv-f1").getValue()).isEqualTo(0.51);
        assertThat(find(result, "selected-model-holdout-f1").getValue()).isEqualTo(0.52);
        assertThat(find(result, "selected-model-holdout-auc").getValue()).isEqualTo(0.77);
        assertThat(find(result, "selected-model-cv-f1").getCi95()).isNull();
        Files.writeString(temporaryDirectory.resolve("phase9_insight_facts.json"), "{}");
        assertThat(service.get()).isSameAs(result);
    }

    @Test
    void emptyBucketHasNoInventedRateOrInterval() throws Exception {
        ObjectNode artifact = fixture();
        ObjectNode bucket = (ObjectNode) artifact.path("defaultByBucket").path("PAY_1").get(0);
        bucket.put("count", 0).put("defaults", 0);
        Fact fact = find(service(artifact, evaluation()).get(), "default-rate-pay1-late2");
        assertThat(fact.getValue()).isNull();
        assertThat(fact.getCi95()).isNull();
        assertThat(fact.getMultiplier()).isNull();
    }

    @Test
    void rejectsMissingEvidenceAndInvalidCounts() throws Exception {
        ObjectNode artifact = fixture();
        ((ObjectNode) artifact.path("defaultByBucket").path("PAY_1").get(0)).put("defaults", 11);
        FactService invalid = service(artifact, evaluation());
        assertThatThrownBy(invalid::get).isInstanceOf(BusinessException.class)
                .hasMessageContaining("counts");
        ObjectNode missing = fixture();
        missing.withObject("/defaultByBucket").remove("SEX");
        FactService incomplete = service(missing, evaluation());
        assertThatThrownBy(incomplete::get).isInstanceOf(BusinessException.class)
                .hasMessageContaining("SEX");
    }

    @Test
    void rejectsDuplicateIdsAndMissingSelectedModel() throws Exception {
        ObjectNode duplicate = fixture();
        duplicate.withObject("/defaultByBucket").withArray("PAY_1")
                .add(duplicate.path("defaultByBucket").path("PAY_1").get(0).deepCopy());
        FactService duplicateService = service(duplicate, evaluation());
        assertThatThrownBy(duplicateService::get).isInstanceOf(BusinessException.class)
                .hasMessageContaining("Duplicate fact IDs");
        ObjectNode missingModel = evaluation();
        missingModel.withObject("/bestVariant").put("variant", "absent");
        FactService missingModelService = service(fixture(), missingModel);
        assertThatThrownBy(missingModelService::get).isInstanceOf(BusinessException.class)
                .hasMessageContaining("Selected model missing");
    }

    @Test
    void wilsonIntervalsRemainDefinedAtZeroAndAllDefaults() throws Exception {
        ObjectNode artifact = fixture();
        ObjectNode bucket = (ObjectNode) artifact.path("defaultByBucket").path("PAY_1").get(0);
        bucket.put("defaults", 0);
        Fact zero = find(service(artifact, evaluation()).get(), "default-rate-pay1-late2");
        assertThat(zero.getCi95().getLow()).isCloseTo(0, within(1e-12));
        assertThat(zero.getCi95().getHigh()).isCloseTo(0.2775401687666166, within(1e-12));
        bucket.put("defaults", 10);
        Fact all = find(service(artifact, evaluation()).get(), "default-rate-pay1-late2");
        assertThat(all.getCi95().getLow()).isCloseTo(0.7224598312333834, within(1e-12));
        assertThat(all.getCi95().getHigh()).isCloseTo(1, within(1e-12));
    }

    @Test
    void realArtifactsCoverAllRequiredBucketsAndPrintFirstTenFacts() throws Exception {
        FactService service = new FactService(mapper);
        ReflectionTestUtils.setField(service, "factsPath", "data/processed/phase9_insight_facts.json");
        ReflectionTestUtils.setField(service, "evaluationPath", "data/processed/phase5_evaluation.json");
        FactResponse result = service.get();
        JsonNode raw = mapper.readTree(Path.of("data/processed/phase9_insight_facts.json").toFile());
        int buckets = dimensions().stream().mapToInt(key -> raw.path("defaultByBucket").path(key).size()).sum();
        assertThat(result.getFacts().stream().filter(f -> f.getSource().contains("$.defaultByBucket."))).hasSize(buckets);
        assertThat(result.getFacts()).extracting(Fact::getFactId).doesNotHaveDuplicates();
        assertThat(result.getFacts()).allSatisfy(f -> {
            assertThat(f.getFactId()).matches("[a-z0-9]+(?:-[a-z0-9]+)*");
            assertThat(f.getDefinition()).isNotBlank();
            assertThat(f.getSource()).contains(".json", "$.");
            assertThat(f.getCategory()).isIn("repayment", "amount", "behaviour", "demographic", "segment", "model");
        });
        Fact pay1 = find(result, "default-rate-pay1-late2");
        assertThat(pay1.getN()).isEqualTo(2666);
        assertThat(pay1.getValue()).isCloseTo(0.691, within(0.001));
        assertThat(pay1.getCi95().getLow()).isCloseTo(0.673, within(0.002));
        assertThat(pay1.getCi95().getHigh()).isCloseTo(0.708, within(0.002));
        assertThat(find(result, "selected-model-holdout-auc").getValue()).isEqualTo(0.7773);
        assertThat(result.getFacts().stream().filter(f -> f.getFactId().startsWith("importance-top"))).hasSize(10);
        for (Fact fact : result.getFacts().stream().limit(10).toList()) {
            System.out.println(mapper.writeValueAsString(fact));
        }
    }

    private Fact find(FactResponse response, String id) {
        return response.getFacts().stream().filter(f -> f.getFactId().equals(id)).findFirst().orElseThrow();
    }

    private FactService service(ObjectNode facts, ObjectNode evaluation) throws Exception {
        Path factsFile = temporaryDirectory.resolve("phase9_insight_facts.json");
        Path evaluationFile = temporaryDirectory.resolve("phase5_evaluation.json");
        mapper.writeValue(factsFile.toFile(), facts);
        mapper.writeValue(evaluationFile.toFile(), evaluation);
        FactService service = new FactService(mapper);
        ReflectionTestUtils.setField(service, "factsPath", factsFile.toString());
        ReflectionTestUtils.setField(service, "evaluationPath", evaluationFile.toString());
        return service;
    }

    private ObjectNode fixture() throws Exception {
        ObjectNode root = (ObjectNode) mapper.readTree("""
                {"generatedAt":"2026-10-10T00:00:00Z","overall":{"rows":100,"defaults":20},
                 "defaultByBucket":{},"byCluster":[{"clusterId":0,"personaName":"Test cluster","size":10,"defaults":7}],
                 "featureImportance":{"metric":"PermutationImportance","method":"holdout column shuffles",
                   "ranking":[{"name":"PAY_1","importance":0.4,"aucDrop":0.03}]}}
                """);
        for (String dimension : dimensions()) {
            root.withObject("/defaultByBucket").putArray(dimension).addObject()
                    .put("bucket", "2").put("count", 10).put("defaults", 7);
        }
        return root;
    }

    private ObjectNode evaluation() throws Exception {
        return (ObjectNode) mapper.readTree("""
                {"split":{"trainRows":80,"testRows":20},
                 "bestVariant":{"algo":"RandomForest","variant":"cost"},
                 "variants":[{"algo":"RandomForest","variant":"baseline","cv":{"f1Default":0.1},"test":{"f1Default":0.2,"rocAuc":0.3}},
                  {"algo":"RandomForest","variant":"cost","cv":{"f1Default":0.51},"test":{"f1Default":0.52,"rocAuc":0.77}}]}
                """);
    }

    private List<String> dimensions() {
        return List.of("PAY_1", "MONTHS_DELAYED", "LIMIT_BAL", "AVG_UTILIZATION", "UTILIZATION_1",
                "PAY_RATIO", "PAY_AMT1", "AGE", "EDUCATION", "MARRIAGE", "SEX", "MAX_DELAY", "RISK_TIER");
    }
}
