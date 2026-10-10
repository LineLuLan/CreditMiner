package com.creditminer.service;

import com.creditminer.dto.response.MiningReportResponse;
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

    private Path fixture(String name, String json) throws Exception {
        return Files.writeString(tempDir.resolve(name), json);
    }

    private MiningReportResponse.PreprocessingMethodology preprocessing(Path phase1, Path phase2,
                                                                       List<String> warnings) {
        MiningReportService service = new MiningReportService(null, null, null, null, null, null, null, mapper);
        ReflectionTestUtils.setField(service, "phase1DescribePath", phase1.toString());
        ReflectionTestUtils.setField(service, "phase2ReportPath", phase2.toString());
        return ReflectionTestUtils.invokeMethod(service, "preprocessingMethodology", warnings);
    }
}
