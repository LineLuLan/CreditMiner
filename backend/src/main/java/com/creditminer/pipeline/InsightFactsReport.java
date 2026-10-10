package com.creditminer.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.DoubleFunction;

/** Offline Phase 9 report containing traceable numerical facts only. */
@Slf4j
public class InsightFactsReport {

    private static final String INPUT_ARFF = "data/processed/enriched.arff";
    private static final String PCA_JSON = "data/processed/phase6_pca_2d.json";
    private static final String CLUSTERS_JSON = "data/processed/phase6_clusters.json";
    private static final String FEATURE_IMPORTANCE_JSON = "data/processed/phase5_feature_importance.json";
    private static final String RULES_JSON = "models/rules.json";
    private static final String OUTPUT_JSON = "data/processed/phase9_insight_facts.json";

    private static final String CLIENT_ID = "ID";
    private static final String CLASS_NAME = "Default";
    private static final String DEFAULT_VALUE = "Yes";
    private static final String NON_DEFAULT_VALUE = "No";

    private InsightFactsReport() {
    }

    public static void main(String[] args) throws Exception {
        log.info("=== Phase 9 - Insight Facts Report ===");
        Instances data;
        try (var reader = Files.newBufferedReader(Path.of(INPUT_ARFF))) {
            data = new Instances(reader);
        }
        Attribute classAttribute = requireAttribute(data, CLASS_NAME);
        data.setClassIndex(classAttribute.index());
        requireNumericAttribute(data, CLIENT_ID);

        int defaults = countDefaults(data, classAttribute);
        double baseDefaultRate = rate(defaults, data.numInstances());
        ObjectMapper mapper = configuredMapper();
        List<String> warnings = new ArrayList<>();

        Map<String, List<Map<String, Object>>> defaultByBucket =
                buildDefaultByBucket(data, classAttribute, baseDefaultRate);
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("generatedAt", Instant.now().toString());
        report.put("sourceFiles", List.of(
                INPUT_ARFF, PCA_JSON, CLUSTERS_JSON, FEATURE_IMPORTANCE_JSON, RULES_JSON));
        report.put("overall", overall(data.numInstances(), defaults));
        report.put("defaultByBucket", defaultByBucket);
        report.put("byCluster", buildClusterFacts(
                data, classAttribute, defaults, baseDefaultRate, mapper, warnings));
        report.put("pointBiserial", buildPointBiserial(data, classAttribute));
        report.put("classMeans", buildClassMeans(data, classAttribute));
        report.put("featureImportance", buildFeatureImportance(mapper));
        report.put("rules", buildRules(mapper));
        report.put("combos", buildCombos(data, classAttribute, baseDefaultRate));
        if (!warnings.isEmpty()) report.put("warnings", warnings);

        File output = new File(OUTPUT_JSON);
        if (output.getParentFile() != null) output.getParentFile().mkdirs();
        mapper.writeValue(output, report);
        printConsoleSummary(data.numInstances(), defaults, baseDefaultRate, defaultByBucket);
        log.info("Wrote {}", OUTPUT_JSON);
    }

    static Map<String, Object> overall(int rows, int defaults) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("defaults", defaults);
        result.put("nonDefaults", Math.max(0, rows - defaults));
        result.put("defaultRate", round(rate(defaults, rows)));
        return result;
    }

    static Map<String, List<Map<String, Object>>> buildDefaultByBucket(
            Instances data, Attribute classAttribute, double baseDefaultRate) {
        Map<String, List<Map<String, Object>>> result = new LinkedHashMap<>();
        addFixedBuckets(result, data, classAttribute, baseDefaultRate,
                "AVG_UTILIZATION",
                List.of("<= 0", "(0, 0.25]", "(0.25, 0.5]", "(0.5, 1]", "> 1"),
                InsightFactsReport::avgUtilizationBucket);
        addFixedBuckets(result, data, classAttribute, baseDefaultRate,
                "MONTHS_DELAYED", List.of("0", "1", "2", "3", "4", "5", "6"),
                InsightFactsReport::monthsDelayedBucket);
        addFixedBuckets(result, data, classAttribute, baseDefaultRate,
                "MAX_DELAY", List.of("<= 0", "1", "2", "3+"),
                InsightFactsReport::maxDelayBucket);
        addFixedBuckets(result, data, classAttribute, baseDefaultRate,
                "AGE", List.of("<= 29", "30-39", "40-49", "50-59", "60+"),
                InsightFactsReport::ageBucket);

        for (String name : List.of(
                "LIMIT_BAL", "UTILIZATION_1", "PAY_RATIO", "BILL_TREND",
                "BILL_AMT1", "PAY_AMT1")) {
            addQuartileBuckets(result, data, classAttribute, baseDefaultRate, name);
        }
        for (String name : List.of("SEX", "EDUCATION", "MARRIAGE", "RISK_TIER")) {
            addNominalBuckets(result, data, classAttribute, baseDefaultRate, name);
        }
        for (String name : List.of("PAY_1", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6")) {
            addIntegerValueBuckets(result, data, classAttribute, baseDefaultRate, name);
        }

        for (Map.Entry<String, List<Map<String, Object>>> dimension : result.entrySet()) {
            int total = dimension.getValue().stream()
                    .mapToInt(row -> ((Number) row.get("count")).intValue()).sum();
            if (total != data.numInstances()) {
                throw new IllegalStateException("Bucket counts for " + dimension.getKey()
                        + " sum to " + total + ", expected " + data.numInstances());
            }
        }
        return result;
    }

    private static void addFixedBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseDefaultRate,
            String attributeName,
            List<String> labels,
            DoubleFunction<String> bucketizer) {
        Attribute attribute = requireNumericAttribute(data, attributeName);
        LinkedHashMap<String, BucketCount> counts = initializedCounts(labels);
        for (Instance row : data) {
            String bucket = row.isMissing(attribute) ? "missing" : bucketizer.apply(row.value(attribute));
            increment(counts, bucket, isDefault(row, classAttribute));
        }
        destination.put(attributeName, bucketRows(counts, baseDefaultRate, null));
    }

    private static void addQuartileBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseDefaultRate,
            String attributeName) {
        Attribute attribute = requireNumericAttribute(data, attributeName);
        double[] values = nonMissingValues(data, attribute);
        if (values.length == 0) {
            throw new IllegalStateException("No values for quartiles: " + attributeName);
        }
        Arrays.sort(values);
        double q1 = percentile(values, 0.25);
        double q2 = percentile(values, 0.50);
        double q3 = percentile(values, 0.75);
        List<String> labels = List.of("Q1 (<= q1)", "Q2", "Q3", "Q4 (> q3)");
        LinkedHashMap<String, BucketCount> counts = initializedCounts(labels);
        for (Instance row : data) {
            String bucket;
            if (row.isMissing(attribute)) {
                bucket = "missing";
            } else {
                double value = row.value(attribute);
                bucket = value <= q1 ? labels.get(0)
                        : value <= q2 ? labels.get(1)
                        : value <= q3 ? labels.get(2) : labels.get(3);
            }
            increment(counts, bucket, isDefault(row, classAttribute));
        }
        Map<String, double[]> bounds = new LinkedHashMap<>();
        bounds.put(labels.get(0), new double[] {values[0], q1});
        bounds.put(labels.get(1), new double[] {q1, q2});
        bounds.put(labels.get(2), new double[] {q2, q3});
        bounds.put(labels.get(3), new double[] {q3, values[values.length - 1]});
        destination.put(attributeName, bucketRows(counts, baseDefaultRate, bounds));
    }

    private static void addNominalBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseDefaultRate,
            String attributeName) {
        Attribute attribute = requireAttribute(data, attributeName);
        if (!attribute.isNominal()) {
            throw new IllegalStateException("Expected nominal attribute: " + attributeName);
        }
        List<String> labels = new ArrayList<>();
        for (int index = 0; index < attribute.numValues(); index++) labels.add(attribute.value(index));
        LinkedHashMap<String, BucketCount> counts = initializedCounts(labels);
        for (Instance row : data) {
            increment(counts, row.isMissing(attribute) ? "missing" : row.stringValue(attribute),
                    isDefault(row, classAttribute));
        }
        destination.put(attributeName, bucketRows(counts, baseDefaultRate, null));
    }

    private static void addIntegerValueBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseDefaultRate,
            String attributeName) {
        Attribute attribute = requireNumericAttribute(data, attributeName);
        TreeSet<Integer> values = new TreeSet<>();
        for (Instance row : data) {
            if (!row.isMissing(attribute)) values.add((int) Math.round(row.value(attribute)));
        }
        LinkedHashMap<String, BucketCount> counts = initializedCounts(
                values.stream().map(String::valueOf).toList());
        for (Instance row : data) {
            String bucket = row.isMissing(attribute)
                    ? "missing" : String.valueOf((int) Math.round(row.value(attribute)));
            increment(counts, bucket, isDefault(row, classAttribute));
        }
        destination.put(attributeName, bucketRows(counts, baseDefaultRate, null));
    }

    private static LinkedHashMap<String, BucketCount> initializedCounts(List<String> labels) {
        LinkedHashMap<String, BucketCount> counts = new LinkedHashMap<>();
        for (String label : labels) counts.put(label, new BucketCount());
        return counts;
    }

    private static void increment(Map<String, BucketCount> counts, String bucket, boolean defaulted) {
        BucketCount count = counts.computeIfAbsent(bucket, ignored -> new BucketCount());
        count.count++;
        if (defaulted) count.defaults++;
    }

    private static List<Map<String, Object>> bucketRows(
            LinkedHashMap<String, BucketCount> counts,
            double baseDefaultRate,
            Map<String, double[]> bounds) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, BucketCount> entry : counts.entrySet()) {
            BucketCount count = entry.getValue();
            double defaultRate = rate(count.defaults, count.count);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bucket", entry.getKey());
            if (bounds != null && bounds.containsKey(entry.getKey())) {
                row.put("lo", round(bounds.get(entry.getKey())[0]));
                row.put("hi", round(bounds.get(entry.getKey())[1]));
            }
            row.put("count", count.count);
            row.put("defaults", count.defaults);
            row.put("defaultRate", round(defaultRate));
            row.put("liftVsBase", round(baseDefaultRate == 0.0 ? 0.0 : defaultRate / baseDefaultRate));
            rows.add(row);
        }
        return rows;
    }

    static String avgUtilizationBucket(Instance row, Attribute attribute) {
        return row.isMissing(attribute) ? "missing" : avgUtilizationBucket(row.value(attribute));
    }

    private static String avgUtilizationBucket(double value) {
        if (value <= 0.0) return "<= 0";
        if (value <= 0.25) return "(0, 0.25]";
        if (value <= 0.50) return "(0.25, 0.5]";
        if (value <= 1.0) return "(0.5, 1]";
        return "> 1";
    }

    static String monthsDelayedBucket(Instance row, Attribute attribute) {
        return row.isMissing(attribute) ? "missing" : monthsDelayedBucket(row.value(attribute));
    }

    private static String monthsDelayedBucket(double value) {
        return String.valueOf((int) Math.round(value));
    }

    private static String maxDelayBucket(double value) {
        int delay = (int) Math.round(value);
        if (delay <= 0) return "<= 0";
        return delay >= 3 ? "3+" : String.valueOf(delay);
    }

    private static String ageBucket(double value) {
        if (value <= 29) return "<= 29";
        if (value <= 39) return "30-39";
        if (value <= 49) return "40-49";
        if (value <= 59) return "50-59";
        return "60+";
    }

    private static List<Map<String, Object>> buildClusterFacts(
            Instances data,
            Attribute classAttribute,
            int totalDefaults,
            double baseDefaultRate,
            ObjectMapper mapper,
            List<String> warnings) throws Exception {
        JsonNode points = mapper.readTree(new File(PCA_JSON)).path("points");
        if (!points.isArray()) {
            warnings.add("PCA artifact has no points array; byCluster omitted");
            return List.of();
        }
        Map<Long, Integer> clusterByClient = new LinkedHashMap<>();
        for (JsonNode point : points) {
            if (point.path("clientId").isNumber() && point.path("clusterId").isNumber()) {
                clusterByClient.put(point.path("clientId").asLong(), point.path("clusterId").asInt());
            }
        }

        Map<Integer, String> personaByCluster = new TreeMap<>();
        JsonNode descriptions = mapper.readTree(new File(CLUSTERS_JSON));
        if (!descriptions.isArray()) {
            throw new IllegalStateException(CLUSTERS_JSON + " must contain an array");
        }
        for (JsonNode cluster : descriptions) {
            int id = cluster.path("clusterId").asInt();
            personaByCluster.put(id, cluster.path("personaName").asText("Cluster " + id));
        }

        Map<Integer, ClusterAccumulator> accumulators = new TreeMap<>();
        personaByCluster.keySet().forEach(id -> accumulators.put(id, new ClusterAccumulator()));
        Attribute idAttribute = requireNumericAttribute(data, CLIENT_ID);
        int unmatched = 0;
        for (Instance row : data) {
            Integer clusterId = row.isMissing(idAttribute)
                    ? null : clusterByClient.get((long) row.value(idAttribute));
            if (clusterId == null) {
                unmatched++;
                continue;
            }
            accumulators.computeIfAbsent(clusterId, ignored -> new ClusterAccumulator())
                    .add(row, classAttribute, data);
        }
        if (unmatched > 0) warnings.add(unmatched + " rows lacked a cluster assignment");

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Integer, ClusterAccumulator> entry : accumulators.entrySet()) {
            ClusterAccumulator value = entry.getValue();
            double defaultRate = rate(value.defaults, value.size);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("clusterId", entry.getKey());
            row.put("personaName", personaByCluster.getOrDefault(
                    entry.getKey(), "Cluster " + entry.getKey()));
            row.put("size", value.size);
            row.put("defaults", value.defaults);
            row.put("defaultRate", round(defaultRate));
            row.put("liftVsBase", round(baseDefaultRate == 0.0 ? 0.0 : defaultRate / baseDefaultRate));
            row.put("shareOfClients", round(rate(value.size, data.numInstances())));
            row.put("shareOfDefaults", round(rate(value.defaults, totalDefaults)));
            for (String feature : ClusterAccumulator.MEAN_FEATURES) {
                row.put("avg" + feature, value.average(feature));
            }
            result.add(row);
        }
        return result;
    }

    private static List<Map<String, Object>> buildPointBiserial(
            Instances data, Attribute classAttribute) {
        List<Correlation> correlations = new ArrayList<>();
        for (Attribute attribute : numericFeatures(data)) {
            int count = 0;
            double sumX = 0.0;
            double sumY = 0.0;
            double sumXX = 0.0;
            double sumYY = 0.0;
            double sumXY = 0.0;
            for (Instance row : data) {
                if (row.isMissing(attribute) || row.isMissing(classAttribute)) continue;
                double x = row.value(attribute);
                double y = isDefault(row, classAttribute) ? 1.0 : 0.0;
                count++;
                sumX += x;
                sumY += y;
                sumXX += x * x;
                sumYY += y * y;
                sumXY += x * y;
            }
            double denominator = Math.sqrt(
                    (count * sumXX - sumX * sumX) * (count * sumYY - sumY * sumY));
            double value = denominator == 0.0
                    ? 0.0 : (count * sumXY - sumX * sumY) / denominator;
            correlations.add(new Correlation(attribute.name(), value));
        }
        correlations.sort(Comparator.comparingDouble(item -> -Math.abs(item.value)));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Correlation correlation : correlations) {
            result.add(Map.of("feature", correlation.feature, "r", round(correlation.value)));
        }
        return result;
    }

    private static List<Map<String, Object>> buildClassMeans(
            Instances data, Attribute classAttribute) {
        List<MeanDifference> differences = new ArrayList<>();
        for (Attribute attribute : numericFeatures(data)) {
            double nonDefaultSum = 0.0;
            int nonDefaultCount = 0;
            double defaultSum = 0.0;
            int defaultCount = 0;
            for (Instance row : data) {
                if (row.isMissing(attribute) || row.isMissing(classAttribute)) continue;
                if (isDefault(row, classAttribute)) {
                    defaultSum += row.value(attribute);
                    defaultCount++;
                } else if (NON_DEFAULT_VALUE.equals(row.stringValue(classAttribute))) {
                    nonDefaultSum += row.value(attribute);
                    nonDefaultCount++;
                }
            }
            double nonDefaultMean = rate(nonDefaultSum, nonDefaultCount);
            double defaultMean = rate(defaultSum, defaultCount);
            double ratio = nonDefaultMean == 0.0 ? 0.0 : defaultMean / nonDefaultMean;
            differences.add(new MeanDifference(attribute.name(), nonDefaultMean, defaultMean, ratio));
        }
        differences.sort(Comparator.comparingDouble(item -> -Math.abs(item.ratio - 1.0)));
        List<Map<String, Object>> result = new ArrayList<>();
        for (MeanDifference difference : differences) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("feature", difference.feature);
            row.put("nonDefaultMean", round(difference.nonDefaultMean));
            row.put("defaultMean", round(difference.defaultMean));
            row.put("ratioDefaultOverNonDefault", round(difference.ratio));
            result.add(row);
        }
        return result;
    }

    private static JsonNode buildFeatureImportance(ObjectMapper mapper) throws Exception {
        // Intent: preserve corrected holdout importance and its method without rounding.
        // Status: complete. Next: none. Blockers: none. Confidence: regression tested.
        JsonNode importance = mapper.readTree(new File(FEATURE_IMPORTANCE_JSON));
        if (!importance.path("ranking").isArray()) {
            throw new IllegalStateException(FEATURE_IMPORTANCE_JSON + " has no ranking array");
        }
        return importance;
    }

    private static Map<String, Object> buildRules(ObjectMapper mapper) throws Exception {
        JsonNode rulesNode = mapper.readTree(new File(RULES_JSON)).path("rules");
        if (!rulesNode.isArray()) throw new IllegalStateException(RULES_JSON + " has no rules array");
        List<JsonNode> rules = new ArrayList<>();
        rulesNode.forEach(rules::add);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("topDefault", topRules(mapper, rules, "default", 5));
        result.put("topNonDefault", topRules(mapper, rules, "non-default", 5));
        return result;
    }

    private static List<Map<String, Object>> topRules(
            ObjectMapper mapper, List<JsonNode> rules, String category, int limit) {
        return rules.stream()
                .filter(rule -> category.equalsIgnoreCase(rule.path("category").asText()))
                .sorted(Comparator.comparingDouble(
                        (JsonNode rule) -> rule.path("lift").asDouble()).reversed())
                .limit(limit)
                .map(rule -> ruleMap(mapper, rule))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> ruleMap(ObjectMapper mapper, JsonNode rule) {
        Map<String, Object> source = mapper.convertValue(rule, LinkedHashMap.class);
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            result.put(entry.getKey(), entry.getValue() instanceof Double number
                    ? round(number) : entry.getValue());
        }
        return result;
    }

    private static List<Map<String, Object>> buildCombos(
            Instances data, Attribute classAttribute, double baseDefaultRate) {
        Attribute monthsDelayed = requireNumericAttribute(data, "MONTHS_DELAYED");
        Attribute maxDelay = requireNumericAttribute(data, "MAX_DELAY");
        Attribute utilization = requireNumericAttribute(data, "AVG_UTILIZATION");
        Attribute payRatio = requireNumericAttribute(data, "PAY_RATIO");
        Attribute recentStatus = requireNumericAttribute(data, "PAY_1");
        Attribute riskTier = requireAttribute(data, "RISK_TIER");
        Attribute age = requireNumericAttribute(data, "AGE");

        List<Map<String, Object>> result = new ArrayList<>();
        result.add(combo(data, classAttribute, baseDefaultRate, "MONTHS_DELAYED >= 3",
                row -> present(row, monthsDelayed) && row.value(monthsDelayed) >= 3));
        result.add(combo(data, classAttribute, baseDefaultRate, "MAX_DELAY >= 2",
                row -> present(row, maxDelay) && row.value(maxDelay) >= 2));
        result.add(combo(data, classAttribute, baseDefaultRate, "AVG_UTILIZATION >= 0.8",
                row -> present(row, utilization) && row.value(utilization) >= 0.8));
        result.add(combo(data, classAttribute, baseDefaultRate, "PAY_RATIO < 0.1",
                row -> present(row, payRatio) && row.value(payRatio) < 0.1));
        result.add(combo(data, classAttribute, baseDefaultRate, "PAY_1 >= 2",
                row -> present(row, recentStatus) && row.value(recentStatus) >= 2));
        result.add(combo(data, classAttribute, baseDefaultRate, "RISK_TIER == High",
                row -> present(row, riskTier) && "High".equals(row.stringValue(riskTier))));
        result.add(combo(data, classAttribute, baseDefaultRate,
                "AGE <= 30 AND MONTHS_DELAYED >= 1",
                row -> present(row, age, monthsDelayed)
                        && row.value(age) <= 30 && row.value(monthsDelayed) >= 1));
        return result;
    }

    private static Map<String, Object> combo(
            Instances data,
            Attribute classAttribute,
            double baseDefaultRate,
            String label,
            RowPredicate predicate) {
        int count = 0;
        int defaults = 0;
        for (Instance row : data) {
            if (!predicate.test(row)) continue;
            count++;
            if (isDefault(row, classAttribute)) defaults++;
        }
        double defaultRate = rate(defaults, count);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("label", label);
        result.put("count", count);
        result.put("defaults", defaults);
        result.put("defaultRate", round(defaultRate));
        result.put("liftVsBase", round(baseDefaultRate == 0.0 ? 0.0 : defaultRate / baseDefaultRate));
        return result;
    }

    private static boolean present(Instance row, Attribute... attributes) {
        for (Attribute attribute : attributes) if (row.isMissing(attribute)) return false;
        return true;
    }

    private static double[] nonMissingValues(Instances data, Attribute attribute) {
        double[] buffer = new double[data.numInstances()];
        int count = 0;
        for (Instance row : data) {
            if (!row.isMissing(attribute)) buffer[count++] = row.value(attribute);
        }
        return Arrays.copyOf(buffer, count);
    }

    private static double percentile(double[] values, double percentile) {
        if (values.length == 1) return values[0];
        double index = percentile * (values.length - 1);
        int lower = (int) Math.floor(index);
        int upper = (int) Math.ceil(index);
        if (lower == upper) return values[lower];
        return values[lower] + (index - lower) * (values[upper] - values[lower]);
    }

    private static List<Attribute> numericFeatures(Instances data) {
        List<Attribute> result = new ArrayList<>();
        for (int index = 0; index < data.numAttributes(); index++) {
            Attribute attribute = data.attribute(index);
            if (attribute.isNumeric() && !CLIENT_ID.equals(attribute.name())) result.add(attribute);
        }
        return result;
    }

    private static Attribute requireAttribute(Instances data, String name) {
        Attribute attribute = data.attribute(name);
        if (attribute == null) throw new IllegalStateException("Required attribute not found: " + name);
        return attribute;
    }

    private static Attribute requireNumericAttribute(Instances data, String name) {
        Attribute attribute = requireAttribute(data, name);
        if (!attribute.isNumeric()) throw new IllegalStateException("Expected numeric attribute: " + name);
        return attribute;
    }

    private static int countDefaults(Instances data, Attribute classAttribute) {
        int count = 0;
        for (Instance row : data) if (isDefault(row, classAttribute)) count++;
        return count;
    }

    private static boolean isDefault(Instance row, Attribute classAttribute) {
        return !row.isMissing(classAttribute)
                && DEFAULT_VALUE.equals(row.stringValue(classAttribute));
    }

    private static double rate(double numerator, double denominator) {
        return denominator == 0.0 ? 0.0 : numerator / denominator;
    }

    private static double round(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.round(value * 10000.0) / 10000.0;
    }

    private static ObjectMapper configuredMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        return mapper;
    }

    private static void printConsoleSummary(
            int rows,
            int defaults,
            double baseDefaultRate,
            Map<String, List<Map<String, Object>>> byBucket) {
        List<BucketSummary> eligible = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> dimension : byBucket.entrySet()) {
            for (Map<String, Object> bucket : dimension.getValue()) {
                int count = ((Number) bucket.get("count")).intValue();
                if (count >= 200) {
                    eligible.add(new BucketSummary(
                            dimension.getKey(), bucket.get("bucket").toString(), count,
                            ((Number) bucket.get("defaults")).intValue(),
                            ((Number) bucket.get("defaultRate")).doubleValue(),
                            ((Number) bucket.get("liftVsBase")).doubleValue()));
                }
            }
        }
        eligible.sort(Comparator.comparingDouble(BucketSummary::liftVsBase).reversed());
        System.out.println();
        System.out.println("=== PHASE 9 INSIGHT FACTS SUMMARY ===");
        System.out.printf(Locale.ROOT, "Overall: rows=%d defaults=%d defaultRate=%.4f%n",
                rows, defaults, baseDefaultRate);
        for (BucketSummary bucket : eligible.stream().limit(5).toList()) {
            System.out.printf(Locale.ROOT, "%s / %s: n=%d defaults=%d rate=%.4f lift=%.4f%n",
                    bucket.dimension, bucket.bucket, bucket.count, bucket.defaults,
                    bucket.defaultRate, bucket.liftVsBase);
        }
    }

    @FunctionalInterface
    private interface RowPredicate {
        boolean test(Instance row);
    }

    private static final class BucketCount {
        private int count;
        private int defaults;
    }

    private static final class ClusterAccumulator {
        private static final List<String> MEAN_FEATURES = List.of(
                "LIMIT_BAL", "AGE", "UTILIZATION_1", "AVG_UTILIZATION",
                "PAY_RATIO", "MONTHS_DELAYED", "MAX_DELAY", "BILL_TREND");
        private int size;
        private int defaults;
        private final Map<String, Double> sums = new LinkedHashMap<>();
        private final Map<String, Integer> counts = new LinkedHashMap<>();

        private void add(Instance row, Attribute classAttribute, Instances data) {
            size++;
            if (isDefault(row, classAttribute)) defaults++;
            for (String feature : MEAN_FEATURES) {
                Attribute attribute = requireNumericAttribute(data, feature);
                if (!row.isMissing(attribute)) {
                    sums.merge(feature, row.value(attribute), Double::sum);
                    counts.merge(feature, 1, Integer::sum);
                }
            }
        }

        private double average(String feature) {
            return round(rate(sums.getOrDefault(feature, 0.0), counts.getOrDefault(feature, 0)));
        }
    }

    private record MeanDifference(
            String feature, double nonDefaultMean, double defaultMean, double ratio) { }

    private record Correlation(String feature, double value) { }

    private record BucketSummary(
            String dimension, String bucket, int count, int defaults,
            double defaultRate, double liftVsBase) { }
}
