package com.creditminer.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import com.creditminer.controller.RuleController;
import com.creditminer.entity.Rule;
import com.creditminer.repository.RuleRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.dto.response.MiningReportResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

class RuleNamingTest {
    @Test
    void namesFixedBinsWithRepaymentFirst() {
        var named = RuleNaming.describe("LIMIT_BAL=<=50000, PAY_1=2", "Default=Yes");
        assertThat(named.shortName()).isEqualTo("Sep: 2 mo late; Limit: <=NT$50k");
        assertThat(named.familyId()).isEqualTo("PAY_1=2");
        assertThat(named.conditions().get(0).label()).isEqualTo("Sep status");
        assertThat(named.conditions().get(1).operator()).isEqualTo("<=");
        assertThat(named.conditions().get(1).unit()).isEqualTo("NT$");
    }

    @Test
    void readsLegacyIntervalsAndDistinctAttributeLabels() {
        assertThat(RuleNaming.describe("AVG_UTILIZATION='(0.56192-inf)'", "Default=Yes").shortName())
                .isEqualTo("Mean use: above 56%");
        assertThat(RuleNaming.describe("PAY_1=2, MAX_DELAY=2", "Default=Yes").shortName())
                .isEqualTo("Sep: 2 mo late; Worst delay: 2 mo late");
        assertThat(RuleNaming.describe("AGE='(-inf-29.5]'", "Default=No").conditions().get(0).operator())
                .isEqualTo("<=");
        assertThat(RuleNaming.describe("PAY_1=-2", "Default=No").shortName()).isEqualTo("Sep: no use");
        assertThat(RuleNaming.describe("PAY_1=-1", "Default=No").shortName()).isEqualTo("Sep: paid in full");
        assertThat(RuleNaming.describe("PAY_1=0", "Default=No").shortName()).isEqualTo("Sep: revolving");
        assertThat(RuleNaming.describe("PAY_1=3+", "Default=Yes").shortName()).isEqualTo("Sep: 3+ mo late");
    }
    @TempDir Path tempDir;
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void currencyBoundsRoundToNearestThousandWithoutDecimals() {
        assertThat(RuleNaming.describe("LIMIT_BAL=140001-240000", "Default=Yes").shortName())
                .isEqualTo("Limit: NT$140k-NT$240k");
        assertThat(RuleNaming.describe("LIMIT_BAL='(140501-240499]'", "Default=Yes").shortName())
                .isEqualTo("Limit: NT$141k-NT$240k");
        assertThat(RuleNaming.describe("LIMIT_BAL=140001-240000", "Default=Yes").conditions().get(0).value())
                .isEqualTo("[140001, 240000]");
    }

    @Test
    void controllerRetainsFamilyPairsNestedUnderMatchingRepresentative() throws Exception {
        RuleRepository repo = mock(RuleRepository.class);
        var service = new RuleService(repo, mapper, mock(CustomerRepository.class));
        Path artifact = Files.writeString(tempDir.resolve("families.json"), """
                {"totalRows":200,"baseline":{"defaultRate":0.2,"totalRows":200},"familyMembers":[
                  {"ruleId":20,"lhs":"PAY_1=2, EDUCATION=Graduate","rhs":"Default=Yes",
                   "support":0.1,"confidence":0.8,"lift":4,"category":"default","jointCount":20},
                  {"ruleId":21,"lhs":"PAY_1=2, SEX=Female","rhs":"Default=No",
                   "support":0.1,"confidence":0.9,"lift":1.125,"category":"non-default","jointCount":20},
                  {"ruleId":22,"lhs":"PAY_1=0, SEX=Male","rhs":"Default=Yes",
                   "support":0.1,"confidence":0.6,"lift":3,"category":"default","jointCount":20}]}
                """);
        ReflectionTestUtils.setField(service, "rulesPath", artifact.toString());
        when(repo.findByMinLiftAndCategory(new BigDecimal("1.25"), "default"))
                .thenReturn(List.of(row("PAY_1=2")));
        var result = new RuleController(service).list(1.25, "default");
        assertThat(result).hasSize(1);
        var members = mapper.valueToTree(result.get(0)).path("familyMembers");
        assertThat(members.size()).isEqualTo(1);
        assertThat(members.get(0).path("familyId").asText()).isEqualTo("PAY_1=2");
        assertThat(members.get(0).path("shortName").asText()).isEqualTo("Sep: 2 mo late; Education: Graduate");
        assertThat(members.get(0).path("jointCount").asLong()).isEqualTo(20);
    }

    @Test
    void controllerPreservesFiltersAndSerializesLegacyAndNewConditions() throws Exception {
        RuleRepository repo = mock(RuleRepository.class);
        CustomerRepository customers = mock(CustomerRepository.class);
        var service = new RuleService(repo, mapper, customers);
        Path artifact = Files.writeString(tempDir.resolve("rules.json"),
                "{\"totalRows\":200,\"baseline\":{\"defaultRate\":0.2,\"totalRows\":200}}");
        ReflectionTestUtils.setField(service, "rulesPath", artifact.toString());
        when(repo.findByMinLiftAndCategory(new BigDecimal("1.25"), "default"))
                .thenReturn(List.of(row("PAY_1=2, LIMIT_BAL=<=50000")));
        var result = new RuleController(service).list(1.25, "default");
        var json = mapper.valueToTree(result.get(0));
        assertThat(json.path("shortName").asText()).isEqualTo("Sep: 2 mo late; Limit: <=NT$50k");
        assertThat(json.path("jointCount").asLong()).isEqualTo(20);
        assertThat(json.path("baseline").asDouble()).isCloseTo(.2, org.assertj.core.data.Offset.offset(1e-12));
        assertThat(json.path("conditions").size()).isEqualTo(2);
        assertThat(json.path("ruleId").asLong()).isEqualTo(7);
        assertThat(json.path("lhs").asText()).isEqualTo("PAY_1=2, LIMIT_BAL=<=50000");
        assertThat(json.path("familyId").asText()).isEqualTo("PAY_1=2");
        verify(repo).findByMinLiftAndCategory(new BigDecimal("1.25"), "default");
        when(repo.findByMinLift(new BigDecimal("1.0"))).thenReturn(List.of(row("AVG_UTILIZATION='(0.56192-inf)'")));
        assertThat(new RuleController(service).list(1, null).get(0).getShortName()).isEqualTo("Mean use: above 56%");
    }

    @Test
    void missingOrMalformedArtifactKeepsDbRulesAvailableWithDbBaseline() throws Exception {
        RuleRepository repo = mock(RuleRepository.class);
        CustomerRepository customers = mock(CustomerRepository.class);
        when(repo.findByMinLift(new BigDecimal("1.0"))).thenReturn(List.of(row("PAY_1=2")));
        when(customers.count()).thenReturn(200L);
        when(customers.countByDefaultFlag("Yes")).thenReturn(40L);
        var service = new RuleService(repo, mapper, customers);
        Path artifact = tempDir.resolve("missing.json");
        ReflectionTestUtils.setField(service, "rulesPath", artifact.toString());
        assertThat(service.list(1, null).get(0).getJointCount()).isEqualTo(20L);
        Files.writeString(artifact, "broken");
        assertThat(service.list(1, " ").get(0).getBaseline()).isCloseTo(.2, org.assertj.core.data.Offset.offset(1e-12));
        Files.writeString(artifact, "");
        assertThat(service.list(1, null).get(0).getFamilyMembers()).isEmpty();
        when(customers.count()).thenReturn(0L);
        assertThat(service.list(1, null).get(0).getJointCount()).isNull();
        assertThat(service.list(1, null).get(0).getBaseline()).isCloseTo(.2, org.assertj.core.data.Offset.offset(1e-12));
    }

    @Test
    void reportNamesDbAndArtifactRulesWithoutInventingZeroCounts() {
        RuleRepository repo = mock(RuleRepository.class);
        CustomerRepository customers = mock(CustomerRepository.class);
        when(repo.findAll()).thenReturn(List.of(row("PAY_1=2")));
        var service = new MiningReportService(customers, null, repo, null, null, null, null, mapper);
        ReflectionTestUtils.setField(service, "rulesPath", tempDir.resolve("missing.json").toString());
        MiningReportResponse.RulesEvidence result = ReflectionTestUtils.invokeMethod(service, "rules", new ArrayList<String>());
        assertThat(result.getTopRules().get(0).getShortName()).isEqualTo("Sep: 2 mo late");
        assertThat(result.getTopRules().get(0).getJointCount()).isNull();
        assertThat(result.getTopRules().get(0).getBaseline()).isCloseTo(.2, org.assertj.core.data.Offset.offset(1e-12));
        when(repo.findAll()).thenReturn(List.of());
        ReflectionTestUtils.setField(service, "rulesPath", "models/rules.json");
        result = ReflectionTestUtils.invokeMethod(service, "rules", new ArrayList<String>());
        assertThat(result.getTopRules()).isNotEmpty().allSatisfy(r -> {
            assertThat(r.getShortName()).isNotBlank();
            assertThat(r.getJointCount()).isPositive();
            assertThat(r.getBaseline()).isBetween(0.0, 1.0);
        });
    }

    @Test
    void demoReadRulesAcceptsArtifactWithoutWritingAnyDatabase() throws Exception {
        var seeder = new DatabaseSeeder(null, null, null, null);
        ReflectionTestUtils.setField(seeder, "rulesJsonPath", "models/rules.json");
        List<Rule> rows = ReflectionTestUtils.invokeMethod(seeder, "readRules");
        var artifact = mapper.readTree(Path.of("models/rules.json").toFile());
        assertThat(rows).hasSize(artifact.path("ruleCount").asInt());
        assertThat(artifact.path("baseline").path("totalRows").asInt()).isEqualTo(29965);
        var baseline = RuleService.baseline(artifact);
        for (int i = 0; i < rows.size(); i++) {
            var source = artifact.path("rules").get(i);
            var response = RuleService.response(rows.get(i), baseline);
            assertThat(response.getShortName()).isEqualTo(source.path("shortName").asText());
            assertThat(response.getFamilyId()).isEqualTo(source.path("familyId").asText());
            com.fasterxml.jackson.databind.JsonNode actualConditions = mapper.valueToTree(response.getConditions());
            assertThat(actualConditions).isEqualTo(source.path("conditions"));
            assertThat(Math.abs(response.getJointCount() - source.path("jointCount").asLong())).isLessThanOrEqualTo(1);
            assertThat(rows.get(i).getLhs()).isEqualTo(source.path("lhs").asText());
        }
        assertThat(rows).allSatisfy(r -> {
            assertThat(r.getLhs()).isNotBlank();
            assertThat(r.getSupport()).isPositive();
        });
    }

    private static Rule row(String lhs) {
        return Rule.builder().ruleId(7L).lhs(lhs).rhs("Default=Yes").support(new BigDecimal("0.1"))
                .confidence(new BigDecimal("0.6")).lift(new BigDecimal("3")).category("default").build();
    }
}
