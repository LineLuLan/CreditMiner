package com.creditminer.controller;

import com.creditminer.exception.GlobalExceptionHandler;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.repository.RuleRepository;
import com.creditminer.service.RuleService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RuleFamiliesControllerTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final RuleRepository repository = mock(RuleRepository.class);
    private final CustomerRepository customers = mock(CustomerRepository.class);

    private MockMvc mvc() {
        RuleService service = new RuleService(repository, mapper, customers);
        ReflectionTestUtils.setField(service, "rulesPath", "models/rules.json");
        return MockMvcBuilders.standaloneSetup(new RuleController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void defaultFamiliesUseSingletonBasesAndExactModifierUplifts() throws Exception {
        String body = mvc().perform(get("/api/rules/families")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode response = mapper.readTree(body);
        assertThat(response.path("baseline").path("totalRows").asInt()).isEqualTo(29965);
        assertThat(response.path("baseline").path("defaultRate").asDouble()).isEqualTo(0.22125813449023862);
        assertThat(response.path("families").size()).isEqualTo(10);
        assertThat(response.path("ungroupedRules").size()).isEqualTo(5);
        double previousLift = Double.POSITIVE_INFINITY;
        JsonNode latest = null;
        for (JsonNode family : response.path("families")) {
            JsonNode base = family.path("baseRule");
            assertThat(family.path("label").asText()).isNotBlank();
            if (base.isNull()) continue;
            assertThat(base.path("conditions").size()).isEqualTo(1);
            assertThat(base.path("category").asText()).isEqualTo("default");
            assertThat(base.path("lift").asDouble()).isLessThanOrEqualTo(previousLift);
            previousLift = base.path("lift").asDouble();
            assertThat(family.path("memberCount").asInt()).isEqualTo(family.path("modifiers").size() + 1);
            double previousConfidence = Double.POSITIVE_INFINITY;
            for (JsonNode modifier : family.path("modifiers")) {
                assertThat(modifier.path("confidence").asDouble()).isLessThanOrEqualTo(previousConfidence);
                previousConfidence = modifier.path("confidence").asDouble();
                assertThat(modifier.path("upliftPp").asDouble()).isEqualTo(
                        Math.round((previousConfidence - base.path("confidence").asDouble()) * 1000) / 10.0);
                assertThat(modifier.path("label").asText()).isNotBlank();
                assertThat(modifier.path("conditionText").asText()).isNotBlank();
                assertThat(modifier.path("jointCount").asLong()).isPositive();
            }
            if (family.path("familyId").asText().equals("PAY_1=2")) latest = family;
        }
        assertThat(latest).isNotNull();
        assertThat(latest.path("baseRule").path("lhsCount").asLong()).isEqualTo(2666);
        assertThat(latest.path("baseRule").path("jointCount").asLong()).isEqualTo(1843);
        assertThat(latest.path("modifiers").get(0).path("lhsCount").asLong()).isEqualTo(563);
        assertThat(latest.path("attributeLabel").asText()).isEqualTo("Latest statement (Sep 2005)");
        assertThat(latest.path("modifiers").size()).isGreaterThanOrEqualTo(3);
        assertThat(latest.path("modifiers").get(0).path("label").asText()).isEqualTo("Age 40-49");
        assertThat(latest.path("modifiers").get(0).path("upliftPp").asDouble()).isEqualTo(4.6);
        assertThat(latest.path("modifiers").get(0).path("jointCount").asLong()).isEqualTo(415);
        for (JsonNode group : response.path("groups")) {
            assertThat(group.path("attributeLabel").asText()).isNotBlank();
            for (JsonNode id : group.path("familyIds")) {
                assertThat(id.asText()).startsWith(group.path("attribute").asText() + "=");
            }
        }
        System.out.println("RULE_FAMILY_MOCKMVC " + latest);
        verifyNoInteractions(repository, customers);
    }

    @Test
    void combinedOnlyFamilyRetainsEveryOrphanWithoutInventingBaseOrUplift() throws Exception {
        JsonNode response = mapper.readTree(mvc().perform(get("/api/rules/families"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode families = response.path("families");
        JsonNode synthetic = families.get(families.size() - 1);
        assertThat(synthetic.path("familyId").asText()).isEqualTo("MONTHS_DELAYED=1");
        assertThat(synthetic.path("attribute").asText()).isEqualTo("MONTHS_DELAYED");
        assertThat(synthetic.path("attributeLabel").asText()).isEqualTo("Late months (of 6)");
        assertThat(synthetic.path("label").asText()).isEqualTo("Late in 1 of 6 months (combined conditions only)");
        assertThat(synthetic.path("baseRule").isNull()).isTrue();
        assertThat(synthetic.path("memberCount").asInt()).isEqualTo(5);
        assertThat(synthetic.path("modifiers").size()).isEqualTo(5);
        for (int i = 0; i < families.size() - 1; i++)
            assertThat(families.get(i).path("baseRule").isObject()).isTrue();
        Set<Long> modifierIds = new HashSet<>();
        double previousConfidence = Double.POSITIVE_INFINITY;
        for (JsonNode modifier : synthetic.path("modifiers")) {
            assertThat(modifier.path("upliftPp").isNull()).isTrue();
            assertThat(modifier.path("confidence").asDouble()).isLessThanOrEqualTo(previousConfidence);
            previousConfidence = modifier.path("confidence").asDouble();
            assertThat(modifier.path("label").asText()).isNotBlank();
            assertThat(modifier.path("conditionText").asText()).isNotBlank();
            modifierIds.add(modifier.path("ruleId").asLong());
        }
        Set<Long> orphanIds = new HashSet<>();
        for (JsonNode orphan : response.path("ungroupedRules")) {
            assertThat(orphan.path("familyId").asText()).isEqualTo("MONTHS_DELAYED=1");
            assertThat(orphan.path("category").asText()).isEqualTo("default");
            orphanIds.add(orphan.path("ruleId").asLong());
        }
        assertThat(orphanIds).hasSize(5).isEqualTo(modifierIds);
        boolean grouped = false;
        for (JsonNode group : response.path("groups")) {
            if (group.path("attribute").asText().equals("MONTHS_DELAYED")) {
                assertThat(group.path("familyIds").get(group.path("familyIds").size() - 1).asText())
                        .isEqualTo("MONTHS_DELAYED=1");
                grouped = true;
            }
        }
        assertThat(grouped).isTrue();
        System.out.println("RULE_COMBINED_FAMILY_MOCKMVC " + synthetic);
        verifyNoInteractions(repository, customers);
    }

    @Test
    void nonDefaultFamiliesAreIsolatedAndSortedBySupport() throws Exception {
        JsonNode response = mapper.readTree(mvc().perform(get("/api/rules/families").param("category", "nonDefault"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(response.path("families").size()).isEqualTo(10);
        assertThat(response.path("ungroupedRules").isEmpty()).isTrue();
        double previousSupport = Double.POSITIVE_INFINITY;
        for (JsonNode family : response.path("families")) {
            JsonNode base = family.path("baseRule");
            assertThat(base.path("category").asText()).isEqualTo("non-default");
            assertThat(base.path("support").asDouble()).isLessThanOrEqualTo(previousSupport);
            previousSupport = base.path("support").asDouble();
        }
        verifyNoInteractions(repository, customers);
    }

    @Test
    void rejectsUnknownCategory() throws Exception {
        mvc().perform(get("/api/rules/families").param("category", "other")).andExpect(status().isBadRequest());
        verifyNoInteractions(repository, customers);
    }

    @Test
    void missingArtifactReturnsNotFoundWithoutDatabaseFallback() throws Exception {
        RuleService service = new RuleService(repository, mapper, customers);
        ReflectionTestUtils.setField(service, "rulesPath", "models/missing-rule-families.json");
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new RuleController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/rules/families")).andExpect(status().isNotFound());
        verifyNoInteractions(repository, customers);
    }
}
