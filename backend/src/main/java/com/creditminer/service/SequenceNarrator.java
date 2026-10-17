package com.creditminer.service;

import com.creditminer.sequence.SequencePattern;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Intent: narrate existing GSP evidence without changing support or temporal semantics.
 * Status: enrichment only; called once per cached artifact load.
 * Next: none. Blockers: no exact counts exported, so Wilson uses support * group size.
 * Confidence: narration, support-difference selection, support thresholds and interval tests cover the contract.
 */
public class SequenceNarrator {
    private static final Map<String, String> LABELS = Map.of(
            "NO_USE", "no card use", "PAID_FULL", "paid in full", "REVOLVING", "revolving",
            "LATE_1", "1 month late", "LATE_2", "2 months late", "LATE_3PLUS", "3+ months late",
            "NONE", "no payment", "PARTIAL", "partial payment", "COVERED", "bill covered",
            "NO_BALANCE", "no balance due");
    private static final Map<String, String> STATUS_PHRASES = Map.of(
            "NO_USE", "no card use", "PAID_FULL", "pays in full", "REVOLVING", "carries a revolving balance",
            "LATE_1", "1 month late", "LATE_2", "2 months late", "LATE_3PLUS", "3+ months late");
    private static final Map<String, String> PAYMENT_PHRASES = Map.of(
            "NONE", "no payment", "PARTIAL", "partial payments", "COVERED", "payments that cover the bill",
            "NO_BALANCE", "nothing due");

    public ObjectNode enrich(ObjectNode root) {
        long defaultCount = root.path("groups").path("default").path("sequences").asLong();
        long nonDefaultCount = root.path("groups").path("nonDefault").path("sequences").asLong();
        ObjectNode stories = root.putObject("stories");
        stories.set("defaultStories", enrichGroup(root.path("topDefaultPatterns"), true,
                defaultCount, nonDefaultCount, root));
        stories.set("nonDefaultStories", enrichGroup(root.path("topNonDefaultPatterns"), false,
                defaultCount, nonDefaultCount, root));
        // Shortlists can contain only permutations of one family; use the full evidence when present.
        if (root.path("patterns").isArray()) {
            stories.set("defaultStories", enrichGroup(storyRows(root, true), true,
                    defaultCount, nonDefaultCount, root));
            stories.set("nonDefaultStories", enrichGroup(storyRows(root, false), false,
                    defaultCount, nonDefaultCount, root));
        }
        return root;
    }

    private static ArrayNode storyRows(ObjectNode root, boolean defaultGroup) {
        ArrayNode rows = root.arrayNode();
        for (JsonNode row : root.path("patterns")) {
            if (!(row instanceof ObjectNode pattern)) throw new IllegalArgumentException("Expected sequence pattern object");
            double yes = support(pattern, "supportDefault");
            double no = support(pattern, "supportNonDefault");
            if (defaultGroup ? yes > no : no > yes) rows.add(pattern.deepCopy());
        }
        return rows;
    }

    private ArrayNode enrichGroup(JsonNode rows, boolean defaultGroup, long yesCount,
                                  long noCount, ObjectNode root) {
        double minimumSupport = minimumSupport(root, defaultGroup);
        List<Candidate> candidates = new ArrayList<>();
        for (JsonNode row : rows) {
            if (!(row instanceof ObjectNode pattern)) throw new IllegalArgumentException("Expected sequence pattern object");
            SequencePattern parsed = SequencePattern.parse(pattern.path("pattern").asText());
            List<Step> steps = steps(parsed);
            List<String> phrases = new ArrayList<>();
            ArrayNode stepNodes = pattern.putArray("steps");
            for (Step step : steps) {
                String phrase = String.join(" + ", step.items());
                phrases.add(phrase + (step.repeat() > 1 ? " x" + step.repeat() : ""));
                ObjectNode stepNode = stepNodes.addObject();
                ArrayNode items = stepNode.putArray("items");
                step.items().forEach(items::add);
                stepNode.put("sameMonth", step.items().size() > 1).put("repeat", step.repeat());
            }
            String text = String.join(", then ", phrases);
            pattern.put("displayText", text.substring(0, 1).toUpperCase(Locale.ROOT) + text.substring(1));
            List<String> familyItems = parsed.elements().stream().flatMap(Set::stream).distinct().sorted().toList();
            String familyId = String.join("|", familyItems);
            pattern.put("familyId", familyId);
            ArrayNode items = pattern.putArray("familyItems");
            familyItems.forEach(items::add);
            pattern.put("familyStory", familyStory(familyItems, parsed.length()));
            double yes = support(pattern, "supportDefault");
            double no = support(pattern, "supportNonDefault");
            double numerator = defaultGroup ? yes : no;
            double denominator = defaultGroup ? no : yes;
            double ratio = denominator > 0 ? numerator / denominator
                    : numerator > 0 ? Double.POSITIVE_INFINITY : Double.NaN;
            if (Double.isFinite(ratio)) pattern.put("groupPrevalenceRatio", ratio);
            else pattern.putNull("groupPrevalenceRatio");
            pattern.put("groupPrevalenceRatioStatus", Double.isNaN(ratio) ? "undefined"
                    : Double.isInfinite(ratio) ? "unbounded" : "finite");
            ObjectNode ci = pattern.putObject("ci95");
            putInterval(ci, "supportDefault", wilson(yes, yesCount));
            putInterval(ci, "supportNonDefault", wilson(no, noCount));
            if (numerator >= minimumSupport) {
                BigDecimal difference = BigDecimal.valueOf(numerator).subtract(BigDecimal.valueOf(denominator));
                candidates.add(new Candidate(pattern, parsed, familyId, difference, ratio));
            }
        }
        // Decimal differences keep equal exported supports tied before ratio, length and canonical text.
        candidates.sort(Comparator.comparing(Candidate::difference).reversed()
                .thenComparing(Comparator.<Candidate>comparingDouble(c -> Double.isNaN(c.ratio()) ? -1 : c.ratio()).reversed())
                .thenComparing(Comparator.comparingInt((Candidate c) -> c.parsed().length()).reversed())
                .thenComparing(c -> c.parsed().value()));
        Map<String, Candidate> families = new LinkedHashMap<>();
        for (Candidate candidate : candidates) families.putIfAbsent(candidate.family(), candidate);
        ArrayNode result = root.arrayNode();
        for (Candidate candidate : families.values()) {
            if (!Double.isNaN(candidate.ratio())) result.add(candidate.json().deepCopy());
            if (result.size() == 5) break;
        }
        return result;
    }

    private static String familyStory(List<String> items, int length) {
        String statuses = String.join(" and ", items.stream().filter(STATUS_PHRASES::containsKey)
                .map(STATUS_PHRASES::get).toList());
        String payments = String.join(" and ", items.stream().filter(PAYMENT_PHRASES::containsKey)
                .map(PAYMENT_PHRASES::get).toList());
        String phrase = statuses.isEmpty() ? payments
                : statuses + (payments.isEmpty() ? "" : " with " + payments);
        String story = phrase + (length == 1 ? " in at least one statement" : " over " + length + " statements");
        return story.substring(0, 1).toUpperCase(Locale.ROOT) + story.substring(1);
    }

    private static double minimumSupport(ObjectNode root, boolean defaultGroup) {
        JsonNode value = root.path("groups").path(defaultGroup ? "default" : "nonDefault").path("minSupportUsed");
        if (value.isMissingNode() || value.isNull()) value = root.path("minSupport");
        if (value.isMissingNode() || value.isNull()) return 0;
        if (!value.isNumber() || !Double.isFinite(value.asDouble()) || value.asDouble() < 0 || value.asDouble() > 1)
            throw new IllegalArgumentException("Invalid sequence minimum support");
        return value.asDouble();
    }

    private static List<Step> steps(SequencePattern pattern) {
        List<Step> result = new ArrayList<>();
        Set<String> previous = null;
        for (Set<String> element : pattern.elements()) {
            if (element.equals(previous)) {
                Step prior = result.get(result.size() - 1);
                result.set(result.size() - 1, new Step(prior.items(), prior.repeat() + 1));
            } else {
                result.add(new Step(element.stream().sorted().map(LABELS::get).toList(), 1));
            }
            previous = element;
        }
        return result;
    }

    private static double support(ObjectNode row, String field) {
        JsonNode value = row.path(field);
        if (!value.isNumber() || !Double.isFinite(value.asDouble()) || value.asDouble() < 0 || value.asDouble() > 1)
            throw new IllegalArgumentException("Missing or invalid sequence support: " + field);
        return value.asDouble();
    }

    /** Wilson score interval at z=1.959963984540054, using exported support * count successes. */
    static Map<String, Double> wilson(double support, long count) {
        if (count <= 0) return null;
        double z = 1.959963984540054;
        double z2 = z * z;
        double denominator = 1 + z2 / count;
        double center = (support + z2 / (2 * count)) / denominator;
        double half = z * Math.sqrt(support * (1 - support) / count + z2 / (4 * count * (double) count)) / denominator;
        Map<String, Double> interval = new LinkedHashMap<>();
        interval.put("low", Math.max(0, center - half));
        interval.put("high", Math.min(1, center + half));
        return interval;
    }

    private static void putInterval(ObjectNode parent, String name, Map<String, Double> interval) {
        if (interval == null) parent.putNull(name);
        else {
            ObjectNode node = parent.putObject(name);
            interval.forEach((key, value) -> node.put(key, value));
        }
    }

    private record Step(List<String> items, int repeat) {}
    private record Candidate(ObjectNode json, SequencePattern parsed, String family, BigDecimal difference, double ratio) {}
}
