package com.creditminer.controller;

import com.creditminer.exception.BusinessException;
import com.creditminer.exception.GlobalExceptionHandler;
import com.creditminer.service.SequenceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SequenceControllerTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void returnsGeneratedSequenceJson() throws Exception {
        Path artifact = temporaryDirectory.resolve("phase10_sequences.json");
        Files.writeString(artifact, "{\"minSupport\":0.1,\"groups\":{\"default\":{\"sequences\":7}}}");
        SequenceService service = service(artifact);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SequenceController(service)).build();

        mvc.perform(get("/api/sequences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minSupport").value(0.1))
                .andExpect(jsonPath("$.groups.default.sequences").value(7));
    }

    @Test
    void exposesNarrationIntervalsAndStoriesWithoutChangingArtifactFields() throws Exception {
        Path artifact = temporaryDirectory.resolve("enriched.json");
        Files.writeString(artifact, """
                {"semanticsVersion":2,"minSupport":0.1,
                 "groups":{"default":{"sequences":100},"nonDefault":{"sequences":200}},
                 "topDefaultPatterns":[{"pattern":"<{PARTIAL}{LATE_2}>","length":2,
                  "supportDefault":0.4,"supportNonDefault":0.1,"ratio":4}],
                 "topNonDefaultPatterns":[{"pattern":"<{PAID_FULL}>",
                  "supportDefault":0.1,"supportNonDefault":0.3}]}
                """);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SequenceController(service(artifact))).build();
        mvc.perform(get("/api/sequences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.semanticsVersion").value(2))
                .andExpect(jsonPath("$.topDefaultPatterns[0].pattern").value("<{PARTIAL}{LATE_2}>"))
                .andExpect(jsonPath("$.topDefaultPatterns[0].displayText").value("Partial payment, then 2 months late"))
                .andExpect(jsonPath("$.topDefaultPatterns[0].steps[1].items[0]").value("2 months late"))
                .andExpect(jsonPath("$.topDefaultPatterns[0].familyId").value("LATE_2|PARTIAL"))
                .andExpect(jsonPath("$.topDefaultPatterns[0].ci95.supportDefault.low").isNumber())
                .andExpect(jsonPath("$.topDefaultPatterns[0].ci95.supportNonDefault.high").isNumber())
                .andExpect(jsonPath("$.stories.defaultStories[0].groupPrevalenceRatio").value(4))
                .andExpect(jsonPath("$.stories.nonDefaultStories[0].displayText").value("Paid in full"));
    }

    @Test
    void missingArtifactIs404WithClearReason() throws Exception {
        Path missing = temporaryDirectory.resolve("missing.json");
        SequenceService service = service(missing);

        BusinessException exception = assertThrows(BusinessException.class, service::get);
        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        assertEquals("Sequence mining artifact not found at " + missing, exception.getMessage());

        // End to end through the global handler: must be 404, not the catch-all 500.
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SequenceController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/sequences"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    private SequenceService service(Path artifact) {
        SequenceService service = new SequenceService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "sequencesPath", artifact.toString());
        return service;
    }
}
