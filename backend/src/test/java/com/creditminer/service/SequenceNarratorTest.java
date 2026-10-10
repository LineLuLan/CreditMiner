package com.creditminer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class SequenceNarratorTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void humanisesOrderedAndSameMonthStepsAndPreservesFields() throws Exception {
        ObjectNode root = input("<{PARTIAL}{LATE_2,PARTIAL}>", .4, .1);
        JsonNode original = root.deepCopy();
        new SequenceNarrator().enrich(root);
        JsonNode pattern = root.path("topDefaultPatterns").get(0);
        assertThat(pattern.path("displayText").asText())
                .isEqualTo("Partial payment, then 2 months late + partial payment");
        assertThat(pattern.path("steps").get(0).path("sameMonth").asBoolean()).isFalse();
        assertThat(pattern.path("steps").get(1).path("sameMonth").asBoolean()).isTrue();
        assertThat(pattern.path("groupPrevalenceRatio").asDouble()).isEqualTo(4);
        original.path("topDefaultPatterns").get(0).fields().forEachRemaining(
                field -> assertThat(pattern.get(field.getKey())).isEqualTo(field.getValue()));
        assertThat(root.path("topNonDefaultPatterns").get(0).path("groupPrevalenceRatio").asDouble())
                .isEqualTo(.25);
        assertThat(pattern.path("ci95").path("supportDefault").path("low").asDouble()).isLessThan(.4);
    }

    @Test
    void runLengthAndFamiliesIgnoreRepeatCountButKeepItemsets() throws Exception {
        ObjectNode root = input("<{REVOLVING}{REVOLVING}{REVOLVING}{PARTIAL}>", .4, .1);
        new SequenceNarrator().enrich(root);
        JsonNode pattern = root.path("topDefaultPatterns").get(0);
        assertThat(pattern.path("displayText").asText()).isEqualTo("Revolving x3, then partial payment");
        assertThat(pattern.path("familyId").asText()).isEqualTo("revolving, then partial payment");
        assertThat(pattern.path("steps").size()).isEqualTo(2);
        assertThat(pattern.path("steps").get(0).path("repeat").asInt()).isEqualTo(3);
    }

    @Test
    void prunesFamiliesAndOrderedSubpatternsBeforeTakingFive() throws Exception {
        ObjectNode root = (ObjectNode) mapper.readTree("""
                {"groups":{"default":{"sequences":100},"nonDefault":{"sequences":100}},
                 "topDefaultPatterns":[
                  {"pattern":"<{LATE_2}>","supportDefault":0.4,"supportNonDefault":0.1},
                  {"pattern":"<{PARTIAL}{LATE_2}>","supportDefault":0.5,"supportNonDefault":0.1},
                  {"pattern":"<{PARTIAL}{PARTIAL}{LATE_2}>","supportDefault":0.6,"supportNonDefault":0.1},
                  {"pattern":"<{LATE_2}{PARTIAL}>","supportDefault":0.7,"supportNonDefault":0.1}]}
                """);
        new SequenceNarrator().enrich(root);
        JsonNode stories = root.path("stories").path("defaultStories");
        assertThat(stories.size()).isEqualTo(2);
        assertThat(stories.get(0).path("pattern").asText()).isEqualTo("<{LATE_2}{PARTIAL}>");
        assertThat(stories.get(1).path("pattern").asText()).isEqualTo("<{PARTIAL}{PARTIAL}{LATE_2}>");
        assertThat(root.path("topDefaultPatterns").size()).isEqualTo(4);
    }

    @Test
    void wilsonMatchesReferenceAndHandlesBoundarySamples() {
        var interval = SequenceNarrator.wilson(.5, 100);
        assertThat(interval.get("low")).isCloseTo(.4038315304, within(1e-9));
        assertThat(interval.get("high")).isCloseTo(.5961684696, within(1e-9));
        assertThat(SequenceNarrator.wilson(0, 100).get("high")).isCloseTo(.0369934982, within(1e-9));
        assertThat(SequenceNarrator.wilson(1, 100).get("low")).isCloseTo(.9630065018, within(1e-9));
        assertThat(SequenceNarrator.wilson(0, 0)).isNull();
    }

    @Test
    void zeroComparisonSupportIsExplicitlyUnboundedNotAnInvalidJsonNumber() throws Exception {
        ObjectNode root = input("<{LATE_2}>", .4, 0);
        new SequenceNarrator().enrich(root);
        JsonNode pattern = root.path("topDefaultPatterns").get(0);
        assertThat(pattern.path("groupPrevalenceRatio").isNull()).isTrue();
        assertThat(pattern.path("groupPrevalenceRatioStatus").asText()).isEqualTo("unbounded");
    }

    private ObjectNode input(String pattern, double yes, double no) throws Exception {
        ObjectNode root = (ObjectNode) mapper.readTree("""
                {"groups":{"default":{"sequences":100},"nonDefault":{"sequences":200}},
                 "topDefaultPatterns":[],"topNonDefaultPatterns":[]}
                """);
        ObjectNode row = mapper.createObjectNode().put("pattern", pattern)
                .put("supportDefault", yes).put("supportNonDefault", no).put("ratio", 99);
        root.withArray("topDefaultPatterns").add(row);
        root.withArray("topNonDefaultPatterns").add(row.deepCopy());
        return root;
    }
}
