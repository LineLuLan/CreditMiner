package com.creditminer.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import com.creditminer.controller.RuleController;
import com.creditminer.entity.Rule;
import com.creditminer.repository.RuleRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.dto.response.MiningReportResponse;
import com.creditminer.dto.response.RuleResponse;
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
    void persistedRepresentativesUseExactArtifactConditionCounts() {
        RuleRepository repo = mock(RuleRepository.class);
        var service = new RuleService(repo, mapper, mock(CustomerRepository.class));
        ReflectionTestUtils.setField(service, "rulesPath", "models/rules.json");
        when(repo.findByMinLift(new BigDecimal("1.0"))).thenReturn(List.of(row("PAY_1=2")));
        var result = service.list(1, null).get(0);
        assertThat(result.getLhsCount()).isEqualTo(2666);
        assertThat(result.getJointCount()).isEqualTo(1843);
        assertThat(result.getFamilyMembers()).anySatisfy(member -> {
            assertThat(member.getLhs()).contains("AGE=40-49");
            assertThat(member.getLhsCount()).isEqualTo(563);
            assertThat(member.getJointCount()).isEqualTo(415);
        });
    }

    @Test
    void noBalanceLabelStatesTheNonPositiveBoundary() {
        var rule = RuleNaming.describe("AVG_UTILIZATION=<=0%", "Default=Yes");
        assertThat(rule.shortName()).isEqualTo("No balance (utilization <= 0%)");
        assertThat(rule.familyLabel()).isEqualTo(rule.shortName());
        assertThat(rule.conditions().get(0).text()).isEqualTo(rule.shortName());
    }
    @Test
    void namesFixedBinsWithRepaymentFirst() {
        var named = RuleNaming.describe("LIMIT_BAL=<=50000, PAY_1=2", "Default=Yes");
        assertThat(named.shortName()).isEqualTo("Latest: 2 months late; Credit limit <= NT$50k");
        assertThat(named.familyId()).isEqualTo("PAY_1=2");
        assertThat(named.conditions().get(0).label()).isEqualTo("Latest statement (Sep 2005)");
        assertThat(named.conditions().get(1).operator()).isEqualTo("<=");
        assertThat(named.conditions().get(1).unit()).isEqualTo("NT$");
    }

    @Test
    void readsLegacyIntervalsAndDistinctAttributeLabels() {
        assertThat(RuleNaming.describe("AVG_UTILIZATION='(0.56192-inf)'", "Default=Yes").shortName())
                .isEqualTo("Utilization above 56%");
        assertThat(RuleNaming.describe("PAY_1=2, MAX_DELAY=2", "Default=Yes").shortName())
                .isEqualTo("Latest: 2 months late; Longest delay: 2 months");
        assertThat(RuleNaming.describe("AGE='(-inf-29.5]'", "Default=No").conditions().get(0).operator())
                .isEqualTo("<=");
        assertThat(RuleNaming.describe("PAY_1=-2", "Default=No").shortName()).isEqualTo("Latest statement: no use");
        assertThat(RuleNaming.describe("PAY_1=-1", "Default=No").shortName()).isEqualTo("Latest statement: paid in full");
        assertThat(RuleNaming.describe("PAY_1=0", "Default=No").shortName()).isEqualTo("Latest statement: revolving");
        assertThat(RuleNaming.describe("PAY_1=3+", "Default=Yes").shortName()).isEqualTo("Latest statement: 3+ months late");
    }
    @TempDir Path tempDir;
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void currencyBoundsRoundToNearestThousandWithoutDecimals() {
        assertThat(RuleNaming.describe("LIMIT_BAL=140001-240000", "Default=Yes").shortName())
                .isEqualTo("Credit limit NT$140k-240k");
        assertThat(RuleNaming.describe("LIMIT_BAL='(140501-240499]'", "Default=Yes").shortName())
                .isEqualTo("Credit limit NT$141k-240k");
        assertThat(RuleNaming.describe("LIMIT_BAL=140001-240000", "Default=Yes").conditions().get(0).value())
                .isEqualTo("[140001, 240000]");
    }

    @Test
    void creditLimitLabelsUseSpacedComparisonsAndOneCurrencyPrefix() {
        String[][] cases = {
                {"<=50000", "Credit limit <= NT$50k"},
                {"50001-140000", "Credit limit NT$50k-140k"},
                {"140001-240000", "Credit limit NT$140k-240k"},
                {">240000", "Credit limit > NT$240k"}
        };
        for (String[] example : cases) {
            var named = RuleNaming.describe("LIMIT_BAL=" + example[0], "Default=Yes");
            assertThat(named.conditions().get(0).text()).isEqualTo(example[1]);
            assertThat(named.shortName()).isEqualTo(example[1]);
            assertThat(named.familyLabel()).isEqualTo(example[1]);
        }
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
        assertThat(members.get(0).path("shortName").asText()).isEqualTo("Latest statement: 2 months late; Graduate school");
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
        assertThat(json.path("shortName").asText()).isEqualTo("Latest: 2 months late; Credit limit <= NT$50k");
        assertThat(json.path("jointCount").asLong()).isEqualTo(20);
        assertThat(json.path("baseline").asDouble()).isCloseTo(.2, org.assertj.core.data.Offset.offset(1e-12));
        assertThat(json.path("conditions").size()).isEqualTo(2);
        assertThat(json.path("ruleId").asLong()).isEqualTo(7);
        assertThat(json.path("lhs").asText()).isEqualTo("PAY_1=2, LIMIT_BAL=<=50000");
        assertThat(json.path("familyId").asText()).isEqualTo("PAY_1=2");
        verify(repo).findByMinLiftAndCategory(new BigDecimal("1.25"), "default");
        when(repo.findByMinLift(new BigDecimal("1.0"))).thenReturn(List.of(row("AVG_UTILIZATION='(0.56192-inf)'")));
        assertThat(new RuleController(service).list(1, null).get(0).getShortName()).isEqualTo("Utilization above 56%");
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
        var service = new MiningReportService(customers, null, repo, null, null, null, null, mapper, null);
        ReflectionTestUtils.setField(service, "rulesPath", tempDir.resolve("missing.json").toString());
        List<RuleResponse> reportRules = ReflectionTestUtils.invokeMethod(service, "loadReportRules", new ArrayList<String>());
        MiningReportResponse.RulesEvidence result = ReflectionTestUtils.invokeMethod(service, "rules", reportRules);
        assertThat(result.getTopRules().get(0).getShortName()).isEqualTo("Latest statement: 2 months late");
        assertThat(result.getTopRules().get(0).getJointCount()).isNull();
        assertThat(result.getTopRules().get(0).getBaseline()).isCloseTo(.2, org.assertj.core.data.Offset.offset(1e-12));
        when(repo.findAll()).thenReturn(List.of());
        ReflectionTestUtils.setField(service, "rulesPath", "models/rules.json");
        reportRules = ReflectionTestUtils.invokeMethod(service, "loadReportRules", new ArrayList<String>());
        result = ReflectionTestUtils.invokeMethod(service, "rules", reportRules);
        assertThat(result.getTopRules()).isNotEmpty().allSatisfy(r -> {
            assertThat(r.getShortName()).isNotBlank();
            assertThat(r.getJointCount()).isPositive();
            assertThat(r.getBaseline()).isBetween(0.0, 1.0);
        });
    }

    @Test
    void demoReadRulesAcceptsArtifactWithoutWritingAnyDatabase() throws Exception {
        var seeder = new DatabaseSeeder(null, null, null, null, null);
        ReflectionTestUtils.setField(seeder, "rulesJsonPath", "models/rules.json");
        List<Rule> rows = ReflectionTestUtils.invokeMethod(seeder, "readRules");
        var artifact = mapper.readTree(Path.of("models/rules.json").toFile());
        assertThat(rows).hasSize(artifact.path("ruleCount").asInt());
        assertThat(artifact.path("baseline").path("totalRows").asInt()).isEqualTo(29965);
        var baseline = RuleService.baseline(artifact);
        for (int i = 0; i < rows.size(); i++) {
            var source = artifact.path("rules").get(i);
            var response = RuleService.response(rows.get(i), baseline);
            assertThat(response.getShortName()).isNotBlank().hasSizeLessThanOrEqualTo(48);
            assertThat(response.getFamilyId()).isEqualTo(source.path("familyId").asText());
            com.fasterxml.jackson.databind.JsonNode actualConditions = mapper.valueToTree(response.getConditions());
            for (int j = 0; j < actualConditions.size(); j++) {
                for (String field : List.of("attribute", "operator", "value", "unit"))
                    assertThat(actualConditions.get(j).path(field)).isEqualTo(source.path("conditions").get(j).path(field));
                assertThat(actualConditions.get(j).path("text").asText()).isNotBlank();
            }
            assertThat(Math.abs(response.getJointCount() - source.path("jointCount").asLong())).isLessThanOrEqualTo(1);
            assertThat(rows.get(i).getLhs()).isEqualTo(source.path("lhs").asText());
        }
        assertThat(rows).allSatisfy(r -> {
            assertThat(r.getLhs()).isNotBlank();
            assertThat(r.getSupport()).isPositive();
        });
    }

    @Test
    void conditionTextUsesReadableWordsAndActualEdges() {
        String[][] cases = {
                {"PAY_1=1", "1 month late on the latest statement"},
                {"PAY_1=2", "2 months late on the latest statement"},
                {"PAY_1=3+", "3+ months late on the latest statement"},
                {"PAY_1=0", "Revolving on the latest statement"},
                {"PAY_1=-1", "Paid in full on the latest statement"},
                {"PAY_1=-2", "No use on the latest statement"},
                {"MAX_DELAY=3+", "Longest delay: 3+ months"},
                {"MAX_DELAY=1", "Longest delay: 1 month"},
                {"MAX_DELAY=<=0", "Longest delay: no delay"},
                {"MONTHS_DELAYED=3+", "Late in 3+ of 6 months"},
                {"MONTHS_DELAYED=0", "Never late"},
                {"AVG_UTILIZATION=<=0%", "No balance (utilization <= 0%)"},
                {"AVG_UTILIZATION=50-100%", "Utilization 50-100%"},
                {"AVG_UTILIZATION=>100%", "Utilization > 100%"},
                {"PAY_RATIO=0-10%", "Pays 0-10% of bills"},
                {"PAY_RATIO=>=100%", "Pays >= 100% of bills"},
                {"AGE=<=29", "Age <=29"},
                {"AGE=40-49", "Age 40-49"},
                {"EDUCATION=HighSchool", "High school"},
                {"MARRIAGE=Married", "Married"},
                {"SEX=Female", "Female"}
        };
        for (String[] example : cases) {
            var named = RuleNaming.describe(example[0], "Default=Yes");
            assertThat(mapper.valueToTree(named.conditions().get(0)).path("text").asText())
                    .as(example[0]).isEqualTo(example[1]);
        }
    }

    @Test
    void everyPublishedRuleHasAsciiTextAndBoundedNames() throws Exception {
        var root = mapper.readTree(Path.of("models/rules.json").toFile());
        for (String section : List.of("rules", "familyMembers")) {
            for (var rule : root.path(section)) {
                var named = RuleNaming.describe(rule.path("lhs").asText(), rule.path("rhs").asText());
                assertThat(named.shortName()).hasSizeLessThanOrEqualTo(48).matches("[\\x20-\\x7E]+");
                for (var condition : named.conditions())
                    assertThat(mapper.valueToTree(condition).path("text").asText()).isNotBlank().matches("[\\x20-\\x7E]+");
            }
        }
    }

    private static Rule row(String lhs) {
        return Rule.builder().ruleId(7L).lhs(lhs).rhs("Default=Yes").support(new BigDecimal("0.1"))
                .confidence(new BigDecimal("0.6")).lift(new BigDecimal("3")).category("default").build();
    }
}
