package com.creditminer.service;

import com.creditminer.sequence.SequencePattern;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

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
 * Confidence: narration, containment and interval tests cover the contract.
 */
public class SequenceNarrator {
    private static final Map<String, String> LABELS = Map.of(
            "NO_USE", "no card use", "PAID_FULL", "paid in full", "REVOLVING", "revolving",
            "LATE_1", "1 month late", "LATE_2", "2 months late", "LATE_3PLUS", "3+ months late",
            "NONE", "no payment", "PARTIAL", "partial payment", "COVERED", "bill covered",
            "NO_BALANCE", "no balance due");

    public ObjectNode enrich(ObjectNode root) {
        long defaultCount = root.path("groups").path("default").path("sequences").asLong();
        long nonDefaultCount = root.path("groups").path("nonDefault").path("sequences").asLong();
        ObjectNode stories = root.putObject("stories");
        stories.set("defaultStories", enrichGroup(root.path("topDefaultPatterns"), true,
                defaultCount, nonDefaultCount, root));
        stories.set("nonDefaultStories", enrichGroup(root.path("topNonDefaultPatterns"), false,
                defaultCount, nonDefaultCount, root));
        return root;
    }

    private ArrayNode enrichGroup(JsonNode rows, boolean defaultGroup, long yesCount,
                                  long noCount, ObjectNode root) {
        List<Candidate> candidates = new ArrayList<>();
        for (JsonNode row : rows) {
            if (!(row instanceof ObjectNode pattern)) throw new IllegalArgumentException("Expected sequence pattern object");
            SequencePattern parsed = SequencePattern.parse(pattern.path("pattern").asText());
            List<Step> steps = steps(parsed);
            List<String> phrases = new ArrayList<>();
            List<String> family = new ArrayList<>();
            ArrayNode stepNodes = pattern.putArray("steps");
            for (Step step : steps) {
                String phrase = String.join(" + ", step.items());
                family.add(phrase);
                phrases.add(phrase + (step.repeat() > 1 ? " x" + step.repeat() : ""));
                ObjectNode stepNode = stepNodes.addObject();
                ArrayNode items = stepNode.putArray("items");
                step.items().forEach(items::add);
                stepNode.put("sameMonth", step.items().size() > 1).put("repeat", step.repeat());
            }
            String text = String.join(", then ", phrases);
            pattern.put("displayText", text.substring(0, 1).toUpperCase(Locale.ROOT) + text.substring(1));
            String familyId = String.join(", then ", family);
            pattern.put("familyId", familyId);
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
            candidates.add(new Candidate(pattern, parsed, familyId, ratio));
        }
        // Stable ties prefer the longer pattern, then canonical artifact text. Undefined ratios rank last.
        candidates.sort(Comparator.<Candidate>comparingDouble(c -> Double.isNaN(c.ratio()) ? -1 : c.ratio())
                .reversed().thenComparing(Comparator.comparingInt((Candidate c) -> c.parsed().length()).reversed())
                .thenComparing(c -> c.parsed().value()));
        Map<String, Candidate> families = new LinkedHashMap<>();
        for (Candidate candidate : candidates) families.putIfAbsent(candidate.family(), candidate);
        List<Candidate> representatives = new ArrayList<>(families.values());
        ArrayNode result = root.arrayNode();
        for (Candidate candidate : representatives) {
            boolean subsumed = representatives.stream().anyMatch(other -> other != candidate
                    && other.ratio() >= candidate.ratio()
                    && candidate.parsed().isContainedBy(other.parsed()));
            if (!subsumed && !Double.isNaN(candidate.ratio())) result.add(candidate.json().deepCopy());
            if (result.size() == 5) break;
        }
        return result;
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
    private record Candidate(ObjectNode json, SequencePattern parsed, String family, double ratio) {}
}
