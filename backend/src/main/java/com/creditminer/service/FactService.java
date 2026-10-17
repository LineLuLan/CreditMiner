package com.creditminer.service;

import com.creditminer.dto.response.FactResponse;
import com.creditminer.dto.response.FactResponse.Baseline;
import com.creditminer.dto.response.FactResponse.ConfidenceInterval;
import com.creditminer.dto.response.FactResponse.Fact;
import com.creditminer.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class FactService {
    private static final String FACT_SOURCE = "data/processed/phase9_insight_facts.json";
    private static final String EVALUATION_SOURCE = "data/processed/phase5_evaluation.json";
    private static final List<String> DIMENSIONS = List.of("PAY_1", "MONTHS_DELAYED", "LIMIT_BAL",
            "AVG_UTILIZATION", "UTILIZATION_1", "PAY_RATIO", "PAY_AMT1", "AGE", "EDUCATION",
            "MARRIAGE", "SEX", "MAX_DELAY", "RISK_TIER");
    private final ObjectMapper mapper;

    @Value("${creditminer.data.insight-facts:data/processed/phase9_insight_facts.json}")
    private String factsPath;
    @Value("${creditminer.data.phase5-evaluation:data/processed/phase5_evaluation.json}")
    private String evaluationPath;
    private volatile FactResponse cached;

    public FactResponse get() {
        FactResponse result = cached;
        if (result != null) return result;
        synchronized (this) {
            if (cached == null) cached = load();
            return cached;
        }
    }

    /* Intent: one immutable evidence snapshot per process, with exact-count uncertainty.
     * Status: complete. Next: restart after regenerating artifacts. Blockers: missing evidence
     * fails closed. Confidence: rates are descriptive Wilson estimates, not causal effects.
     */
    private FactResponse load() {
        try {
            JsonNode root = mapper.readTree(new File(factsPath));
            JsonNode evaluation = mapper.readTree(new File(evaluationPath));
            JsonNode overall = required(root, "overall");
            int rows = count(overall, "rows");
            int defaults = count(overall, "defaults");
            if (rows == 0 || defaults > rows) throw new IllegalArgumentException("Invalid overall counts");
            double base = (double) defaults / rows;
            List<Fact> facts = new ArrayList<>();
            facts.add(proportion("default-rate-overall", "Overall default rate", defaults, rows, base,
                    "Default=Yes clients divided by all cleaned clients.",
                    "$.overall.defaults / $.overall.rows", "behaviour"));
            addBuckets(root, facts, base);
            addClusters(root, facts, rows, defaults, base);
            addLatestLateTail(root, facts, base);
            addCombos(root, facts, base);
            addImportance(root, evaluation, facts);
            addModelMetrics(evaluation, facts);
            if (facts.stream().anyMatch(fact -> !fact.getFactId().matches("[a-z0-9]+(?:-[a-z0-9]+)*"))) {
                throw new IllegalArgumentException("Invalid fact ID in source evidence");
            }
            if (facts.stream().map(Fact::getFactId).distinct().count() != facts.size()) {
                throw new IllegalArgumentException("Duplicate fact IDs in source evidence");
            }
            return FactResponse.builder().version("1.0.0")
                    .generatedAt(text(root, "generatedAt"))
                    .baseline(new Baseline(base, rows, defaults)).facts(List.copyOf(facts)).build();
        } catch (Exception exception) {
            throw new BusinessException("FACTS_NOT_AVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                    "Cannot load facts catalogue: " + exception.getMessage());
        }
    }

    private void addBuckets(JsonNode root, List<Fact> facts, double base) {
        JsonNode dimensions = required(root, "defaultByBucket");
        for (String dimension : DIMENSIONS) {
            JsonNode buckets = array(dimensions, dimension);
            for (int i = 0; i < buckets.size(); i++) {
                JsonNode bucket = buckets.get(i);
                String label = text(bucket, "bucket");
                String path = "$.defaultByBucket." + dimension + "[" + i + "]";
                String bounds = bucket.has("lo") && bucket.has("hi")
                        ? " Artifact bounds: lo=" + bucket.get("lo") + ", hi=" + bucket.get("hi") + "."
                        : "";
                facts.add(proportion("default-rate-" + dimensionSlug(dimension) + "-" + bucketSlug(dimension, label),
                        dimension + " " + label + ": default rate", count(bucket, "defaults"), count(bucket, "count"),
                        base, "Default=Yes clients divided by clients in " + dimension + " bucket " + label + "."
                                + bounds + " " + featureDefinition(dimension),
                        path + ".defaults / " + path + ".count", category(dimension)));
            }
        }
    }

    private void addClusters(JsonNode root, List<Fact> facts, int total, int defaults, double base) {
        JsonNode clusters = array(root, "byCluster");
        int delayingDefaults = 0;
        int delayingClients = 0;
        for (int i = 0; i < clusters.size(); i++) {
            JsonNode cluster = clusters.get(i);
            int id = count(cluster, "clusterId");
            int size = count(cluster, "size");
            int hits = count(cluster, "defaults");
            String label = text(cluster, "personaName");
            if (label.contains("delayers")) {
                delayingDefaults += hits;
                delayingClients += size;
            }
            String path = "$.byCluster[" + i + "]";
            facts.add(proportion("default-rate-cluster-" + id, label + ": default rate", hits, size, base,
                    "Default=Yes clients divided by all clients assigned to " + label + ".",
                    path + ".defaults / " + path + ".size", "segment"));
            facts.add(proportion("share-of-clients-cluster-" + id, label + ": share of clients", size, total, null,
                    "Clients in " + label + " divided by all cleaned clients.",
                    path + ".size / $.overall.rows", "segment"));
            facts.add(proportion("share-of-defaults-cluster-" + id, label + ": share of defaults", hits, defaults, null,
                    "Default=Yes clients in " + label + " divided by all Default=Yes clients.",
                    path + ".defaults / $.overall.defaults", "segment"));
        }
        facts.add(proportion("share-of-defaults-delayers", "Delaying personas: share of defaults",
                delayingDefaults, defaults, null, "Defaults in persistent and occasional delaying personas divided by all defaults.",
                "$.byCluster[?(@.personaName contains 'delayers')].defaults / $.overall.defaults", "segment"));
        facts.add(proportion("share-of-clients-delayers", "Delaying personas: share of clients",
                delayingClients, total, null, "Clients in persistent and occasional delaying personas divided by all clients.",
                "$.byCluster[?(@.personaName contains 'delayers')].size / $.overall.rows", "segment"));
    }

    private void addLatestLateTail(JsonNode root, List<Fact> facts, double base) {
        for (int minimum : List.of(2, 3)) {
            int size = 0;
            int hits = 0;
            for (JsonNode bucket : array(required(root, "defaultByBucket"), "PAY_1")) {
                if (Integer.parseInt(text(bucket, "bucket")) < minimum) continue;
                size += count(bucket, "count");
                hits += count(bucket, "defaults");
            }
            String source = "$.defaultByBucket.PAY_1[?(@.bucket >= " + minimum + ")]";
            String label = minimum + "+ months late on latest statement";
            facts.add(proportion("default-rate-pay1-late" + minimum + "plus", label + ": default rate",
                    hits, size, base, "Defaults divided by clients with PAY_1 >= " + minimum + ".",
                    source + ".defaults / " + source + ".count", "repayment"));
            facts.add(Fact.builder().factId("count-pay1-late" + minimum + "plus").label(label + ": clients")
                    .value((double) size).unit("count").n(size).definition("Clients with PAY_1 >= " + minimum + ".")
                    .source(FACT_SOURCE + "#" + source + ".count").category("repayment").build());
        }
    }

    private void addCombos(JsonNode root, List<Fact> facts, double base) {
        JsonNode combos = root.path("combos");
        for (int i = 0; i < combos.size(); i++) {
            JsonNode combo = combos.get(i);
            if (!"MONTHS_DELAYED >= 3".equals(combo.path("label").asText())) continue;
            String path = "$.combos[" + i + "]";
            facts.add(proportion("default-rate-months-delayed-ge3", "At least three delayed months: default rate",
                    count(combo, "defaults"), count(combo, "count"), base,
                    "Default=Yes clients divided by clients with at least three of six repayment statuses >= 1.",
                    path + ".defaults / " + path + ".count", "repayment"));
        }
    }

    private void addImportance(JsonNode root, JsonNode evaluation, List<Fact> facts) {
        JsonNode importance = required(root, "featureImportance");
        String metric = text(importance, "metric");
        String method = text(importance, "method");
        JsonNode ranking = array(importance, "ranking");
        for (int i = 0; i < Math.min(10, ranking.size()); i++) {
            JsonNode entry = ranking.get(i);
            String name = text(entry, "name");
            double value = number(entry, "importance");
            facts.add(Fact.builder().factId("importance-top" + (i + 1)).label(name + " importance")
                    .value(value).unit("share").n(count(required(evaluation, "split"), "testRows"))
                    .definition(metric + ": " + method + ". Value is the normalized importance share; aucDrop is raw ROC AUC drop.")
                    .source(FACT_SOURCE + "#$.featureImportance.ranking[" + i + "]")
                    .category("model").name(name).importance(value).aucDrop(number(entry, "aucDrop")).build());
        }
    }

    private void addModelMetrics(JsonNode evaluation, List<Fact> facts) {
        JsonNode best = required(evaluation, "bestVariant");
        String algo = text(best, "algo");
        String variant = text(best, "variant");
        JsonNode variants = array(evaluation, "variants");
        for (int i = 0; i < variants.size(); i++) {
            JsonNode candidate = variants.get(i);
            if (!algo.equals(candidate.path("algo").asText()) || !variant.equals(candidate.path("variant").asText())) continue;
            JsonNode split = required(evaluation, "split");
            addMetric(facts, candidate, i, "cv", "f1Default", "selected-model-cv-f1",
                    algo + " " + variant + " CV F1", count(split, "trainRows"), "Cross-validation F1 for Default=Yes on training folds.");
            addMetric(facts, candidate, i, "test", "f1Default", "selected-model-holdout-f1",
                    algo + " " + variant + " holdout F1", count(split, "testRows"), "Holdout F1 for Default=Yes.");
            addMetric(facts, candidate, i, "test", "rocAuc", "selected-model-holdout-auc",
                    algo + " " + variant + " holdout ROC AUC", count(split, "testRows"), "Holdout ROC AUC for the selected model.");
            return;
        }
        throw new IllegalArgumentException("Selected model missing from evaluation variants");
    }

    private void addMetric(List<Fact> facts, JsonNode candidate, int index, String split, String metric,
                           String id, String label, int n, String definition) {
        facts.add(Fact.builder().factId(id).label(label).value(number(required(candidate, split), metric))
                .unit("score").n(n).definition(definition + " No binomial confidence interval applies to this metric.")
                .source(EVALUATION_SOURCE + "#$.variants[" + index + "]." + split + "." + metric)
                .category("model").build());
    }

    private Fact proportion(String id, String label, int successes, int n, Double base,
                            String definition, String source, String category) {
        if (successes > n) throw new IllegalArgumentException("Invalid counts for " + id);
        Double value = n == 0 ? null : (double) successes / n;
        return Fact.builder().factId(id).label(label).value(value)
                .unit(id.startsWith("share-of-") ? "share" : "%").n(n).baseline(base)
                .multiplier(value == null || base == null || base == 0 ? null : value / base)
                .ci95(n == 0 ? null : wilson(successes, n)).definition(definition)
                .source(FACT_SOURCE + "#" + source).category(category).build();
    }

    private ConfidenceInterval wilson(int successes, int n) {
        double p = (double) successes / n;
        double z2 = 1.96 * 1.96;
        double denominator = 1 + z2 / n;
        double center = (p + z2 / (2 * n)) / denominator;
        double half = 1.96 * Math.sqrt(p * (1 - p) / n + z2 / (4.0 * n * n)) / denominator;
        return new ConfidenceInterval(Math.max(0, center - half), Math.min(1, center + half));
    }

    private static String dimensionSlug(String dimension) {
        return switch (dimension) {
            case "PAY_1" -> "pay1";
            case "LIMIT_BAL" -> "limit";
            case "PAY_RATIO" -> "payment-ratio";
            case "PAY_AMT1" -> "payment-amount";
            case "UTILIZATION_1" -> "utilization";
            case "MAX_DELAY" -> "worst-delay";
            default -> slug(dimension);
        };
    }

    private static String category(String dimension) {
        return switch (dimension) {
            case "PAY_1", "MONTHS_DELAYED", "MAX_DELAY" -> "repayment";
            case "LIMIT_BAL", "PAY_AMT1" -> "amount";
            case "AVG_UTILIZATION", "UTILIZATION_1", "PAY_RATIO" -> "behaviour";
            case "AGE", "EDUCATION", "MARRIAGE", "SEX" -> "demographic";
            case "RISK_TIER" -> "segment";
            default -> throw new IllegalArgumentException("Unknown dimension: " + dimension);
        };
    }

    private static String bucketSlug(String dimension, String bucket) {
        if (bucket.matches("Q[1-4].*")) return bucket.substring(0, 2).toLowerCase(Locale.ROOT);
        if ("PAY_1".equals(dimension) && bucket.matches("[1-9][0-9]*")) return "late" + bucket;
        return switch (bucket) {
            case "<= 0" -> "le0";
            case "> 1" -> "gt1";
            case "(0, 0.25]" -> "gt0-le0-25";
            case "(0.25, 0.5]" -> "gt0-25-le0-5";
            case "(0.5, 1]" -> "gt0-5-le1";
            case "<= 29" -> "le29";
            case "3+" -> "ge3";
            default -> slug(bucket.startsWith("-") ? "minus" + bucket.substring(1) : bucket.replace("+", "-plus"));
        };
    }

    private static String slug(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private static String featureDefinition(String dimension) {
        return switch (dimension) {
            case "MONTHS_DELAYED" -> "Number of six repayment statuses >= 1.";
            case "MAX_DELAY" -> "Maximum of the six repayment status codes.";
            case "PAY_RATIO" -> "Six-month payments divided by positive bills, denominator at least 1, clipped to [0,5].";
            case "AVG_UTILIZATION" -> "Mean of six monthly bill-to-limit ratios, clipped to [-1,5].";
            case "UTILIZATION_1" -> "Most recent bill divided by credit limit, clipped to [-1,5].";
            case "LIMIT_BAL" -> "Credit limit in NT dollars; quartiles are from the cleaned dataset.";
            case "PAY_AMT1" -> "Most recent payment in NT dollars; quartiles are from the cleaned dataset.";
            case "RISK_TIER" -> "Engineered tier from repayment delays and average utilization; descriptive, not a model prediction.";
            default -> "Observed cleaned-dataset group; association does not establish causation.";
        };
    }

    private static JsonNode required(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) throw new IllegalArgumentException("Missing evidence: " + field);
        return value;
    }

    private static JsonNode array(JsonNode node, String field) {
        JsonNode value = required(node, field);
        if (!value.isArray() || value.isEmpty()) throw new IllegalArgumentException("Missing evidence array: " + field);
        return value;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = required(node, field);
        if (!value.isTextual() || value.asText().isBlank()) throw new IllegalArgumentException("Invalid text: " + field);
        return value.asText();
    }

    private static int count(JsonNode node, String field) {
        JsonNode value = required(node, field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.intValue() < 0) {
            throw new IllegalArgumentException("Invalid counts: " + field);
        }
        return value.intValue();
    }

    private static double number(JsonNode node, String field) {
        JsonNode value = required(node, field);
        if (!value.isNumber() || !Double.isFinite(value.doubleValue())) throw new IllegalArgumentException("Invalid number: " + field);
        return value.doubleValue();
    }
}
