package com.creditminer.controller;

import com.creditminer.exception.GlobalExceptionHandler;
import com.creditminer.service.FactService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FactControllerTest {
    @Test
    void servesVersionedCatalogueWithoutDatabaseOrServer() throws Exception {
        FactService service = new FactService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "factsPath", "data/processed/phase9_insight_facts.json");
        ReflectionTestUtils.setField(service, "evaluationPath", "data/processed/phase5_evaluation.json");
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new FactController(service)).build();
        mvc.perform(get("/api/facts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value("1.0.0"))
                .andExpect(jsonPath("$.generatedAt").isString())
                .andExpect(jsonPath("$.baseline.totalClients").value(29965))
                .andExpect(jsonPath("$.baseline.defaultCount").value(6630))
                .andExpect(jsonPath("$.facts[0].factId").value("default-rate-overall"))
                .andExpect(jsonPath("$.facts[0].ci95.low").isNumber())
                .andExpect(jsonPath("$.facts[0].ci95.high").isNumber());
    }

    @Test
    void missingArtifactReturnsUnavailableInsteadOfEmptyCatalogue() throws Exception {
        FactService service = new FactService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "factsPath", "missing-facts-artifact.json");
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new FactController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/facts"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("FACTS_NOT_AVAILABLE"));
    }
}
