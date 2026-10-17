package com.creditminer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    void runLengthAndFamiliesUseSortedDistinctItemCodes() throws Exception {
        ObjectNode root = input("<{REVOLVING}{REVOLVING}{REVOLVING}{PARTIAL}>", .4, .1);
        new SequenceNarrator().enrich(root);
        JsonNode pattern = root.path("topDefaultPatterns").get(0);
        assertThat(pattern.path("displayText").asText()).isEqualTo("Revolving x3, then partial payment");
        assertThat(pattern.path("familyId").asText()).isEqualTo("PARTIAL|REVOLVING");
        assertThat(pattern.path("familyItems")).isEqualTo(mapper.readTree("[\"PARTIAL\",\"REVOLVING\"]"));
        assertThat(pattern.path("steps").size()).isEqualTo(2);
        assertThat(pattern.path("steps").get(0).path("repeat").asInt()).isEqualTo(3);
    }

    @Test
    void picksHighestSupportDifferencePerFamilyAndPreservesDistinctSubpatternFamilies() throws Exception {
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
        assertThat(stories.get(1).path("pattern").asText()).isEqualTo("<{LATE_2}>");
        assertThat(root.path("topDefaultPatterns").size()).isEqualTo(4);
    }

    @Test
    void commonPatternWinsOverRarerHigherRatioPatternWithinFamily() throws Exception {
        ObjectNode root = input("<{LATE_2,PARTIAL}>", .6, .3);
        root.withArray("topDefaultPatterns").addObject().put("pattern", "<{PARTIAL}{LATE_2}{PARTIAL}>")
                .put("supportDefault", .2).put("supportNonDefault", .01);
        new SequenceNarrator().enrich(root);
        JsonNode representative = root.path("stories").path("defaultStories").get(0);
        assertThat(representative.path("pattern").asText()).isEqualTo("<{LATE_2,PARTIAL}>");
        assertThat(representative.path("groupPrevalenceRatio").asDouble()).isEqualTo(2);
        assertThat(representative.path("displayText").asText()).isEqualTo("2 months late + partial payment");
        assertThat(representative.path("ci95").path("supportDefault"))
                .isEqualTo(mapper.valueToTree(SequenceNarrator.wilson(.6, 100)));
        assertThat(representative.path("ci95").path("supportNonDefault"))
                .isEqualTo(mapper.valueToTree(SequenceNarrator.wilson(.3, 200)));
    }

    @Test
    void equalDecimalSupportDifferencesPreferHigherRatioBeforeLength() throws Exception {
        ObjectNode root = input("<{LATE_2,PARTIAL}>", .3, .1);
        root.withArray("topDefaultPatterns").addObject().put("pattern", "<{PARTIAL}{LATE_2}{PARTIAL}>")
                .put("supportDefault", .4).put("supportNonDefault", .2);
        new SequenceNarrator().enrich(root);
        assertThat(root.path("stories").path("defaultStories").get(0).path("pattern").asText())
                .isEqualTo("<{LATE_2,PARTIAL}>");
    }

    @Test
    void equalRatiosPreferLongerRepresentativeRegardlessOfItemOrder() throws Exception {
        ObjectNode root = input("<{LATE_2,PARTIAL}>", .4, .1);
        root.withArray("topDefaultPatterns").addObject().put("pattern", "<{PARTIAL}{LATE_2}{PARTIAL}>")
                .put("supportDefault", .4).put("supportNonDefault", .1);
        new SequenceNarrator().enrich(root);
        JsonNode stories = root.path("stories").path("defaultStories");
        assertThat(stories.size()).isEqualTo(1);
        assertThat(stories.get(0).path("pattern").asText()).isEqualTo("<{PARTIAL}{LATE_2}{PARTIAL}>");
    }

    @Test
    void equalDifferenceRatioAndLengthPreferCanonicalText() throws Exception {
        ObjectNode root = input("<{PARTIAL}{LATE_2}>", .4, .1);
        root.withArray("topDefaultPatterns").addObject().put("pattern", "<{LATE_2}{PARTIAL}>")
                .put("supportDefault", .4).put("supportNonDefault", .1);
        new SequenceNarrator().enrich(root);
        assertThat(root.path("stories").path("defaultStories").get(0).path("pattern").asText())
                .isEqualTo("<{LATE_2}{PARTIAL}>");
    }

    @Test
    void eachGroupChoosesRepresentativeUsingItsOwnSupportDifference() throws Exception {
        ObjectNode root = input("<{PARTIAL}{REVOLVING}>", .4, .1);
        ObjectNode alternate = mapper.createObjectNode().put("pattern", "<{REVOLVING}{PARTIAL}>")
                .put("supportDefault", .1).put("supportNonDefault", .4);
        root.withArray("topDefaultPatterns").add(alternate);
        root.withArray("topNonDefaultPatterns").add(alternate.deepCopy());
        new SequenceNarrator().enrich(root);
        assertThat(root.path("stories").path("defaultStories").get(0).path("pattern").asText())
                .isEqualTo("<{PARTIAL}{REVOLVING}>");
        assertThat(root.path("stories").path("nonDefaultStories").get(0).path("pattern").asText())
                .isEqualTo("<{REVOLVING}{PARTIAL}>");
    }

    @Test
    void ownGroupMinimumSupportExcludesRareRowsAndIncludesExactBoundary() throws Exception {
        ObjectNode root = input("<{LATE_2}>", .29, .001);
        root.put("minSupport", .1);
        ((ObjectNode) root.path("groups").path("default")).put("minSupportUsed", .3);
        ((ObjectNode) root.path("groups").path("nonDefault")).put("minSupportUsed", .2);
        var patterns = root.putArray("patterns");
        patterns.addObject().put("pattern", "<{LATE_2}>")
                .put("supportDefault", .29).put("supportNonDefault", .001);
        patterns.addObject().put("pattern", "<{LATE_2}{LATE_2}>")
                .put("supportDefault", .3).put("supportNonDefault", .1);
        patterns.addObject().put("pattern", "<{PARTIAL}>")
                .put("supportDefault", .001).put("supportNonDefault", .19);
        patterns.addObject().put("pattern", "<{PARTIAL}{PARTIAL}>")
                .put("supportDefault", .1).put("supportNonDefault", .2);
        new SequenceNarrator().enrich(root);
        JsonNode defaultStories = root.path("stories").path("defaultStories");
        JsonNode nonDefaultStories = root.path("stories").path("nonDefaultStories");
        assertThat(defaultStories.size()).isEqualTo(1);
        assertThat(nonDefaultStories.size()).isEqualTo(1);
        assertThat(defaultStories.get(0).path("pattern").asText()).isEqualTo("<{LATE_2}{LATE_2}>");
        assertThat(nonDefaultStories.get(0).path("pattern").asText()).isEqualTo("<{PARTIAL}{PARTIAL}>");
        assertThat(root.path("topDefaultPatterns").get(0).path("displayText").asText()).isEqualTo("2 months late");
    }

    @Test
    void rootMinimumSupportAppliesToLegacyShortlistsAndMissingThresholdKeepsThemAvailable() throws Exception {
        ObjectNode root = input("<{LATE_2}>", .2, .1);
        root.put("minSupport", .3);
        new SequenceNarrator().enrich(root);
        assertThat(root.path("stories").path("defaultStories").size()).isZero();
        assertThat(root.path("stories").path("nonDefaultStories").size()).isZero();
        root.remove("minSupport");
        new SequenceNarrator().enrich(root);
        assertThat(root.path("stories").path("defaultStories").size()).isEqualTo(1);
        assertThat(root.path("stories").path("nonDefaultStories").size()).isEqualTo(1);
    }

    @Test
    void familyStoriesUseBusinessPhrasesAndActualStatementLength() throws Exception {
        assertThat(story("<{LATE_2}{PARTIAL}>"))
                .isEqualTo("2 months late with partial payments over 2 statements");
        assertThat(story("<{REVOLVING}{PARTIAL}{REVOLVING}{PARTIAL}{REVOLVING}{PARTIAL}>"))
                .isEqualTo("Carries a revolving balance with partial payments over 6 statements");
        assertThat(story("<{NO_USE}{PAID_FULL}>"))
                .isEqualTo("No card use and pays in full over 2 statements");
        assertThat(story("<{LATE_1,NONE}{LATE_2,COVERED}{LATE_3PLUS,NO_BALANCE}>"))
                .isEqualTo("1 month late and 2 months late and 3+ months late with payments that cover the bill and no payment and nothing due over 3 statements");
        assertThat(story("<{PARTIAL}{PARTIAL}>"))
                .isEqualTo("Partial payments over 2 statements");
        assertThat(story("<{LATE_2}>"))
                .isEqualTo("2 months late in at least one statement");
        assertThat(story("<{LATE_2,PARTIAL}>"))
                .isEqualTo("2 months late with partial payments in at least one statement");
    }

    @Test
    void actualArtifactReturnsFiveDistinctFamiliesPerGroupFromFullPatternPool() throws Exception {
        ObjectNode root = (ObjectNode) mapper.readTree(Path.of("data/processed/phase10_sequences.json").toFile());
        JsonNode originalPatterns = root.path("patterns").deepCopy();
        new SequenceNarrator().enrich(root);
        for (String group : new String[]{"defaultStories", "nonDefaultStories"}) {
            JsonNode stories = root.path("stories").path(group);
            assertThat(stories.size()).isEqualTo(5);
            Set<String> families = new HashSet<>();
            List<String> orderedFamilies = new ArrayList<>();
            List<String> narratives = new ArrayList<>();
            for (JsonNode story : stories) {
                assertThat(families.add(story.path("familyId").asText())).isTrue();
                orderedFamilies.add(story.path("familyId").asText());
                assertThat(story.path("familyStory").asText()).isNotBlank();
                narratives.add(story.path("familyStory").asText());
                assertThat(story.path("familyItems").size()).isPositive();
                assertThat(story.path("groupPrevalenceRatio").asDouble()).isGreaterThan(1);
                for (JsonNode source : originalPatterns) {
                    if (source.path("pattern").equals(story.path("pattern"))) {
                        source.fields().forEachRemaining(field ->
                                assertThat(story.get(field.getKey())).isEqualTo(field.getValue()));
                    }
                }
                System.out.printf("SEQUENCE_STORY %s | %s | default=%.5f | nonDefault=%.5f | %s%n",
                        group, story.path("familyId").asText(), story.path("supportDefault").asDouble(),
                        story.path("supportNonDefault").asDouble(), story.path("familyStory").asText());
            }
            if (group.equals("defaultStories")) {
                assertSupports(stories, new double[]{.58084, .47466, .46667, .42066, .35158},
                        new double[]{.19147, .13366, .18676, .14116, .11695});
                assertThat(orderedFamilies).containsExactly("LATE_2", "LATE_2|PARTIAL", "NONE",
                        "LATE_2|NONE", "LATE_2|REVOLVING");
                assertThat(narratives).containsExactly(
                        "2 months late in at least one statement",
                        "2 months late with partial payments in at least one statement",
                        "No payment in at least one statement",
                        "2 months late with no payment over 2 statements",
                        "2 months late and carries a revolving balance over 2 statements");
            } else {
                assertSupports(stories, new double[]{.16471, .15475, .2629, .27391, .26199},
                        new double[]{.38912, .3769, .40917, .40626, .3637});
                assertThat(orderedFamilies).containsExactly("PARTIAL|REVOLVING", "REVOLVING", "COVERED",
                        "PARTIAL", "PAID_FULL");
                assertThat(narratives).containsExactly(
                        "Carries a revolving balance with partial payments over 6 statements",
                        "Carries a revolving balance over 6 statements",
                        "Payments that cover the bill in at least one statement",
                        "Partial payments over 5 statements",
                        "Pays in full in at least one statement");
            }
        }
        assertThat(root.path("patterns")).isEqualTo(originalPatterns);
    }

    private static void assertSupports(JsonNode stories, double[] yes, double[] no) {
        for (int index = 0; index < stories.size(); index++) {
            assertThat(stories.get(index).path("supportDefault").asDouble()).isEqualTo(yes[index]);
            assertThat(stories.get(index).path("supportNonDefault").asDouble()).isEqualTo(no[index]);
        }
    }

    private String story(String pattern) throws Exception {
        ObjectNode root = input(pattern, .4, .1);
        new SequenceNarrator().enrich(root);
        return root.path("stories").path("defaultStories").get(0).path("familyStory").asText();
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
                .put("supportDefault", yes).put("supportNonDefault", no).put("ratio", 99)
                .put("supportDiff", yes - no);
        root.withArray("topDefaultPatterns").add(row);
        root.withArray("topNonDefaultPatterns").add(row.deepCopy());
        return root;
    }
}
