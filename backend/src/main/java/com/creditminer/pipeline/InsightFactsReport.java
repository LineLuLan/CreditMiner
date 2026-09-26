package com.creditminer.pipeline;

import com.creditminer.service.DataLoader;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;

import java.io.File;
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

/**
 * OFFLINE Phase 9 report that derives the numerical evidence used by business insights.
 *
 * <p>Pipeline breadcrumb: intent = replace hand-written evidence with reproducible facts;
 * status = generated entirely from Phase 3/5/6/7 artifacts; next = write narrative insights
 * from this JSON; blockers = none when all input artifacts are present; confidence = high.</p>
 */
@Slf4j
public class InsightFactsReport {

    private static final String INPUT_ARFF = "data/processed/enriched.arff";
    private static final String PCA_JSON = "data/processed/phase6_pca_2d.json";
    private static final String CLUSTERS_JSON = "data/processed/phase6_clusters.json";
    private static final String FEATURE_IMPORTANCE_JSON = "data/processed/phase5_feature_importance.json";
    private static final String RULES_JSON = "models/rules.json";
    private static final String OUTPUT_JSON = "data/processed/phase9_insight_facts.json";

    private static final String CLIENT_ID = "CLIENTNUM";
    private static final String CLASS_NAME = "Attrition_Flag";
    private static final String ATTRITED = "Attrited Customer";
    private static final String EXISTING = "Existing Customer";

    private InsightFactsReport() {
    }

    public static void main(String[] args) throws Exception {
        log.info("=== Phase 9 - Insight Facts Report ===");

        Instances data = new DataLoader().loadArff(INPUT_ARFF);
        Attribute classAttribute = requireAttribute(data, CLASS_NAME);
        data.setClassIndex(classAttribute.index());
        requireAttribute(data, CLIENT_ID);

        int attrited = countAttrited(data, classAttribute);
        double baseChurnRate = rate(attrited, data.numInstances());
        List<String> warnings = new ArrayList<>();
        ObjectMapper mapper = configuredMapper();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("generatedAt", Instant.now().toString());
        report.put("overall", overall(data.numInstances(), attrited, baseChurnRate));

        Map<String, List<Map<String, Object>>> churnByBucket =
                buildChurnByBucket(data, classAttribute, baseChurnRate);
        report.put("churnByBucket", churnByBucket);
        report.put("byCluster", buildClusterFacts(
                data, classAttribute, attrited, baseChurnRate, mapper, warnings));
        report.put("pointBiserial", buildPointBiserial(data, classAttribute));
        report.put("classMeans", buildClassMeans(data, classAttribute));
        report.put("featureImportance", buildFeatureImportance(mapper));
        report.put("rules", buildRules(mapper));
        report.put("combos", buildCombos(data, classAttribute, baseChurnRate));
        if (!warnings.isEmpty()) {
            report.put("warnings", warnings);
        }

        File output = new File(OUTPUT_JSON);
        if (output.getParentFile() != null) {
            output.getParentFile().mkdirs();
        }
        mapper.writeValue(output, report);
        log.info("Wrote {}", OUTPUT_JSON);

        printConsoleSummary(data.numInstances(), attrited, baseChurnRate, churnByBucket);
        log.info("=== Phase 9 DONE ===");
    }

    private static ObjectMapper configuredMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        return mapper;
    }

    private static Map<String, Object> overall(int rows, int attrited, double churnRate) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("attrited", attrited);
        result.put("churnRate", round(churnRate));
        return result;
    }

    private static Map<String, List<Map<String, Object>>> buildChurnByBucket(
            Instances data, Attribute classAttribute, double baseChurnRate) {
        Map<String, List<Map<String, Object>>> result = new LinkedHashMap<>();

        addFixedBuckets(result, data, classAttribute, baseChurnRate,
                "Avg_Utilization_Ratio",
                List.of("0", "(0, 0.25]", "(0.25, 0.5]", "(0.5, 0.75]", "> 0.75"),
                InsightFactsReport::avgUtilizationBucket);
        addFixedBuckets(result, data, classAttribute, baseChurnRate,
                "Months_Inactive_12_mon", List.of("0", "1", "2", "3", "4+"),
                InsightFactsReport::monthsInactiveBucket);
        addFixedBuckets(result, data, classAttribute, baseChurnRate,
                "Contacts_Count_12_mon", List.of("0", "1", "2", "3", "4", "5", "6+"),
                InsightFactsReport::contactsBucket);
        addFixedBuckets(result, data, classAttribute, baseChurnRate,
                "Total_Relationship_Count", List.of("1", "2", "3", "4", "5", "6"),
                InsightFactsReport::integerBucket);

        addQuartileBuckets(result, data, classAttribute, baseChurnRate, "Total_Trans_Ct");
        addQuartileBuckets(result, data, classAttribute, baseChurnRate, "Total_Trans_Amt");
        addQuartileBuckets(result, data, classAttribute, baseChurnRate, "Total_Amt_Chng_Q4_Q1");
        addQuartileBuckets(result, data, classAttribute, baseChurnRate, "Total_Ct_Chng_Q4_Q1");

        addFixedBuckets(result, data, classAttribute, baseChurnRate,
                "Total_Revolving_Bal", List.of("0", "(0, 1000]", "(1000, 2000]", "> 2000"),
                InsightFactsReport::revolvingBalanceBucket);
        addQuartileBuckets(result, data, classAttribute, baseChurnRate, "Credit_Limit");

        for (String attributeName : List.of(
                "Card_Category", "Income_Category", "Gender", "Customer_Tier",
                "Education_Level", "Marital_Status")) {
            addNominalBuckets(result, data, classAttribute, baseChurnRate, attributeName);
        }
        addIntegerValueBuckets(result, data, classAttribute, baseChurnRate, "Dependent_count");

        for (Map.Entry<String, List<Map<String, Object>>> dimension : result.entrySet()) {
            int bucketedRows = dimension.getValue().stream()
                    .mapToInt(row -> ((Number) row.get("count")).intValue())
                    .sum();
            if (bucketedRows != data.numInstances()) {
                throw new IllegalStateException("Bucket counts for " + dimension.getKey()
                        + " sum to " + bucketedRows + ", expected " + data.numInstances());
            }
        }
        return result;
    }

    private static void addFixedBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseChurnRate,
            String attributeName,
            List<String> labels,
            DoubleFunction<String> bucketizer) {
        Attribute attribute = requireNumericAttribute(data, attributeName);
        LinkedHashMap<String, BucketCount> counts = initializedCounts(labels);
        for (Instance row : data) {
            String bucket = row.isMissing(attribute) ? "missing" : bucketizer.apply(row.value(attribute));
            increment(counts, bucket, isAttrited(row, classAttribute));
        }
        destination.put(attributeName, bucketRows(counts, baseChurnRate, null));
    }

    private static void addQuartileBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseChurnRate,
            String attributeName) {
        Attribute attribute = requireNumericAttribute(data, attributeName);
        double[] values = nonMissingValues(data, attribute);
        if (values.length == 0) {
            throw new IllegalStateException("No non-missing values for quartiles: " + attributeName);
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
                        : value <= q3 ? labels.get(2)
                        : labels.get(3);
            }
            increment(counts, bucket, isAttrited(row, classAttribute));
        }

        Map<String, double[]> bounds = new LinkedHashMap<>();
        bounds.put(labels.get(0), new double[] {values[0], q1});
        bounds.put(labels.get(1), new double[] {q1, q2});
        bounds.put(labels.get(2), new double[] {q2, q3});
        bounds.put(labels.get(3), new double[] {q3, values[values.length - 1]});
        destination.put(attributeName, bucketRows(counts, baseChurnRate, bounds));
    }

    private static void addNominalBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseChurnRate,
            String attributeName) {
        Attribute attribute = requireAttribute(data, attributeName);
        if (!attribute.isNominal()) {
            throw new IllegalStateException("Expected nominal attribute: " + attributeName);
        }
        List<String> labels = new ArrayList<>();
        for (int i = 0; i < attribute.numValues(); i++) {
            labels.add(attribute.value(i));
        }
        LinkedHashMap<String, BucketCount> counts = initializedCounts(labels);
        for (Instance row : data) {
            String bucket = row.isMissing(attribute) ? "missing" : row.stringValue(attribute);
            increment(counts, bucket, isAttrited(row, classAttribute));
        }
        destination.put(attributeName, bucketRows(counts, baseChurnRate, null));
    }

    private static void addIntegerValueBuckets(
            Map<String, List<Map<String, Object>>> destination,
            Instances data,
            Attribute classAttribute,
            double baseChurnRate,
            String attributeName) {
        Attribute attribute = requireNumericAttribute(data, attributeName);
        TreeSet<Integer> values = new TreeSet<>();
        for (Instance row : data) {
            if (!row.isMissing(attribute)) {
                values.add((int) Math.round(row.value(attribute)));
            }
        }
        List<String> labels = values.stream().map(String::valueOf).toList();
        LinkedHashMap<String, BucketCount> counts = initializedCounts(labels);
        for (Instance row : data) {
            String bucket = row.isMissing(attribute) ? "missing" : integerBucket(row.value(attribute));
            increment(counts, bucket, isAttrited(row, classAttribute));
        }
        destination.put(attributeName, bucketRows(counts, baseChurnRate, null));
    }

    private static LinkedHashMap<String, BucketCount> initializedCounts(List<String> labels) {
        LinkedHashMap<String, BucketCount> counts = new LinkedHashMap<>();
        for (String label : labels) {
            counts.put(label, new BucketCount());
        }
        return counts;
    }

    private static void increment(Map<String, BucketCount> counts, String bucket, boolean attrited) {
        BucketCount count = counts.computeIfAbsent(bucket, ignored -> new BucketCount());
        count.count++;
        if (attrited) {
            count.attrited++;
        }
    }

    private static List<Map<String, Object>> bucketRows(
            LinkedHashMap<String, BucketCount> counts,
            double baseChurnRate,
            Map<String, double[]> bounds) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, BucketCount> entry : counts.entrySet()) {
            BucketCount count = entry.getValue();
            double churnRate = rate(count.attrited, count.count);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bucket", entry.getKey());
            if (bounds != null && bounds.containsKey(entry.getKey())) {
                row.put("lo", round(bounds.get(entry.getKey())[0]));
                row.put("hi", round(bounds.get(entry.getKey())[1]));
            }
            row.put("count", count.count);
            row.put("attrited", count.attrited);
            row.put("churnRate", round(churnRate));
            row.put("liftVsBase", round(baseChurnRate == 0.0 ? 0.0 : churnRate / baseChurnRate));
            rows.add(row);
        }
        return rows;
    }

    static String avgUtilizationBucket(Instance row, Attribute attribute) {
        return row.isMissing(attribute) ? "missing" : avgUtilizationBucket(row.value(attribute));
    }

    private static String avgUtilizationBucket(double value) {
        if (value == 0.0) return "0";
        if (value <= 0.25) return "(0, 0.25]";
        if (value <= 0.50) return "(0.25, 0.5]";
        if (value <= 0.75) return "(0.5, 0.75]";
        return "> 0.75";
    }

    static String monthsInactiveBucket(Instance row, Attribute attribute) {
        return row.isMissing(attribute) ? "missing" : monthsInactiveBucket(row.value(attribute));
    }

    private static String monthsInactiveBucket(double value) {
        int months = (int) Math.round(value);
        return months >= 4 ? "4+" : String.valueOf(months);
    }

    private static String contactsBucket(double value) {
        int contacts = (int) Math.round(value);
        return contacts >= 6 ? "6+" : String.valueOf(contacts);
    }

    private static String integerBucket(double value) {
        return String.valueOf((int) Math.round(value));
    }

    private static String revolvingBalanceBucket(double value) {
        if (value == 0.0) return "0";
        if (value <= 1000.0) return "(0, 1000]";
        if (value <= 2000.0) return "(1000, 2000]";
        return "> 2000";
    }

    private static List<Map<String, Object>> buildClusterFacts(
            Instances data,
            Attribute classAttribute,
            int totalAttrited,
            double baseChurnRate,
            ObjectMapper mapper,
            List<String> warnings) throws Exception {
        JsonNode pcaRoot = mapper.readTree(new File(PCA_JSON));
        JsonNode points = pcaRoot.get("points");
        if (points == null || !points.isArray() || points.isEmpty()
                || points.get(0).get("clientNum") == null
                || points.get(0).get("clusterId") == null) {
            warnings.add("phase6_pca_2d.json has no per-customer cluster id; byCluster omitted");
            return List.of();
        }

        Map<Long, Integer> clusterByClient = new LinkedHashMap<>();
        for (JsonNode point : points) {
            JsonNode clientNum = point.get("clientNum");
            JsonNode clusterId = point.get("clusterId");
            if (clientNum != null && clientNum.isNumber() && clusterId != null && clusterId.isNumber()) {
                clusterByClient.put(clientNum.asLong(), clusterId.asInt());
            }
        }

        Map<Integer, String> personaByCluster = new TreeMap<>();
        JsonNode clusterDescriptions = mapper.readTree(new File(CLUSTERS_JSON));
        if (!clusterDescriptions.isArray()) {
            throw new IllegalStateException(CLUSTERS_JSON + " must contain a JSON array");
        }
        for (JsonNode cluster : clusterDescriptions) {
            personaByCluster.put(cluster.path("clusterId").asInt(),
                    cluster.path("personaName").asText("Cluster " + cluster.path("clusterId").asInt()));
        }

        Map<Integer, ClusterAccumulator> accumulators = new TreeMap<>();
        personaByCluster.keySet().forEach(id -> accumulators.put(id, new ClusterAccumulator()));
        Attribute clientAttribute = requireNumericAttribute(data, CLIENT_ID);
        int unmatched = 0;
        for (Instance row : data) {
            if (row.isMissing(clientAttribute)) {
                unmatched++;
                continue;
            }
            Integer clusterId = clusterByClient.get((long) row.value(clientAttribute));
            if (clusterId == null) {
                unmatched++;
                continue;
            }
            ClusterAccumulator accumulator =
                    accumulators.computeIfAbsent(clusterId, ignored -> new ClusterAccumulator());
            accumulator.add(row, classAttribute, data);
        }
        if (unmatched > 0) {
            warnings.add(unmatched + " ARFF rows had no PCA cluster assignment and were omitted from byCluster");
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Integer, ClusterAccumulator> entry : accumulators.entrySet()) {
            int clusterId = entry.getKey();
            ClusterAccumulator value = entry.getValue();
            double churnRate = rate(value.attrited, value.size);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("clusterId", clusterId);
            row.put("personaName", personaByCluster.getOrDefault(clusterId, "Cluster " + clusterId));
            row.put("size", value.size);
            row.put("attrited", value.attrited);
            row.put("churnRate", round(churnRate));
            row.put("liftVsBase", round(baseChurnRate == 0.0 ? 0.0 : churnRate / baseChurnRate));
            row.put("shareOfCustomers", round(rate(value.size, data.numInstances())));
            row.put("shareOfAttrited", round(rate(value.attrited, totalAttrited)));
            row.put("avgCreditLimit", value.average("Credit_Limit"));
            row.put("avgUtilization", value.average("Avg_Utilization_Ratio"));
            row.put("avgTransAmt", value.average("Total_Trans_Amt"));
            row.put("avgTransCt", value.average("Total_Trans_Ct"));
            row.put("avgRevolvingBal", value.average("Total_Revolving_Bal"));
            row.put("avgRiskScore", value.average("Risk_Score"));
            result.add(row);
        }
        return result;
    }

    private static List<Map<String, Object>> buildPointBiserial(
            Instances data, Attribute classAttribute) {
        List<Correlation> correlations = new ArrayList<>();
        for (Attribute attribute : numericFeatures(data)) {
            int n = 0;
            double sumX = 0.0;
            double sumY = 0.0;
            double sumXX = 0.0;
            double sumYY = 0.0;
            double sumXY = 0.0;
            for (Instance row : data) {
                if (row.isMissing(attribute) || row.isMissing(classAttribute)) continue;
                double x = row.value(attribute);
                double y = isAttrited(row, classAttribute) ? 1.0 : 0.0;
                n++;
                sumX += x;
                sumY += y;
                sumXX += x * x;
                sumYY += y * y;
                sumXY += x * y;
            }
            double denominator = Math.sqrt(
                    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
            double correlation = denominator == 0.0
                    ? 0.0
                    : (n * sumXY - sumX * sumY) / denominator;
            correlations.add(new Correlation(attribute.name(), correlation));
        }
        correlations.sort(Comparator.comparingDouble(
                correlation -> -Math.abs(correlation.value)));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Correlation correlation : correlations) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("feature", correlation.feature);
            row.put("r", round(correlation.value));
            result.add(row);
        }
        return result;
    }

    private static List<Map<String, Object>> buildClassMeans(
            Instances data, Attribute classAttribute) {
        List<MeanDifference> differences = new ArrayList<>();
        for (Attribute attribute : numericFeatures(data)) {
            double existingSum = 0.0;
            int existingCount = 0;
            double attritedSum = 0.0;
            int attritedCount = 0;
            for (Instance row : data) {
                if (row.isMissing(attribute) || row.isMissing(classAttribute)) continue;
                String classValue = row.stringValue(classAttribute);
                if (EXISTING.equals(classValue)) {
                    existingSum += row.value(attribute);
                    existingCount++;
                } else if (ATTRITED.equals(classValue)) {
                    attritedSum += row.value(attribute);
                    attritedCount++;
                }
            }
            double existingMean = rate(existingSum, existingCount);
            double attritedMean = rate(attritedSum, attritedCount);
            double ratio = existingMean == 0.0 ? 0.0 : attritedMean / existingMean;
            differences.add(new MeanDifference(
                    attribute.name(), existingMean, attritedMean, ratio));
        }
        differences.sort(Comparator.comparingDouble(
                difference -> -Math.abs(difference.ratio - 1.0)));

        List<Map<String, Object>> result = new ArrayList<>();
        for (MeanDifference difference : differences) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("feature", difference.feature);
            row.put("existingMean", round(difference.existingMean));
            row.put("attritedMean", round(difference.attritedMean));
            row.put("ratioAttritedOverExisting", round(difference.ratio));
            result.add(row);
        }
        return result;
    }

    private static List<Map<String, Object>> buildFeatureImportance(ObjectMapper mapper) throws Exception {
        JsonNode ranking = mapper.readTree(new File(FEATURE_IMPORTANCE_JSON)).path("ranking");
        if (!ranking.isArray()) {
            throw new IllegalStateException(FEATURE_IMPORTANCE_JSON + " has no ranking array");
        }
        List<JsonNode> ranked = new ArrayList<>();
        ranking.forEach(ranked::add);
        ranked.sort(Comparator.comparingDouble((JsonNode node) -> node.path("importance").asDouble()).reversed());
        double total = ranked.stream().mapToDouble(node -> node.path("importance").asDouble()).sum();

        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode item : ranked.stream().limit(10).toList()) {
            double importance = item.path("importance").asDouble();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", item.path("name").asText());
            row.put("importance", round(importance));
            row.put("share", round(total == 0.0 ? 0.0 : importance / total));
            result.add(row);
        }
        return result;
    }

    private static Map<String, Object> buildRules(ObjectMapper mapper) throws Exception {
        JsonNode rulesNode = mapper.readTree(new File(RULES_JSON)).path("rules");
        if (!rulesNode.isArray()) {
            throw new IllegalStateException(RULES_JSON + " has no rules array");
        }
        List<JsonNode> rules = new ArrayList<>();
        rulesNode.forEach(rules::add);

        List<Map<String, Object>> topChurn = rules.stream()
                .filter(rule -> "churn".equalsIgnoreCase(rule.path("category").asText()))
                .sorted(Comparator.comparingDouble((JsonNode rule) -> rule.path("lift").asDouble()).reversed())
                .limit(5)
                .map(rule -> ruleMap(mapper, rule))
                .toList();
        List<Map<String, Object>> topRetention = rules.stream()
                .filter(rule -> "retention".equalsIgnoreCase(rule.path("category").asText()))
                .sorted(Comparator.comparingDouble((JsonNode rule) -> rule.path("support").asDouble()).reversed())
                .limit(3)
                .map(rule -> ruleMap(mapper, rule))
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("topChurn", topChurn);
        result.put("topRetention", topRetention);
        return result;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> ruleMap(ObjectMapper mapper, JsonNode rule) {
        Map<String, Object> source = mapper.convertValue(rule, LinkedHashMap.class);
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            Object value = entry.getValue();
            result.put(entry.getKey(), value instanceof Double number ? round(number) : value);
        }
        return result;
    }

    private static List<Map<String, Object>> buildCombos(
            Instances data, Attribute classAttribute, double baseChurnRate) {
        Attribute inactive = requireNumericAttribute(data, "Months_Inactive_12_mon");
        Attribute contacts = requireNumericAttribute(data, "Contacts_Count_12_mon");
        Attribute revolving = requireNumericAttribute(data, "Total_Revolving_Bal");
        Attribute transCount = requireNumericAttribute(data, "Total_Trans_Ct");
        Attribute transAmount = requireNumericAttribute(data, "Total_Trans_Amt");
        Attribute countChange = requireNumericAttribute(data, "Total_Ct_Chng_Q4_Q1");
        Attribute utilization = requireNumericAttribute(data, "Avg_Utilization_Ratio");
        Attribute cardCategory = requireAttribute(data, "Card_Category");
        double transCountQ1 = quartile(data, transCount, 0.25);
        double transAmountQ1 = quartile(data, transAmount, 0.25);

        List<Map<String, Object>> result = new ArrayList<>();
        result.add(combo(data, classAttribute, baseChurnRate,
                "Months_Inactive_12_mon >= 3 AND Total_Trans_Ct <= q1(Total_Trans_Ct)",
                row -> present(row, inactive, transCount)
                        && row.value(inactive) >= 3.0 && row.value(transCount) <= transCountQ1));
        result.add(combo(data, classAttribute, baseChurnRate,
                "Contacts_Count_12_mon >= 4",
                row -> present(row, contacts) && row.value(contacts) >= 4.0));
        result.add(combo(data, classAttribute, baseChurnRate,
                "Total_Revolving_Bal == 0",
                row -> present(row, revolving) && row.value(revolving) == 0.0));
        result.add(combo(data, classAttribute, baseChurnRate,
                "Total_Trans_Ct <= q1 AND Total_Trans_Amt <= q1",
                row -> present(row, transCount, transAmount)
                        && row.value(transCount) <= transCountQ1
                        && row.value(transAmount) <= transAmountQ1));
        result.add(combo(data, classAttribute, baseChurnRate,
                "Avg_Utilization_Ratio == 0 AND Total_Revolving_Bal == 0",
                row -> present(row, utilization, revolving)
                        && row.value(utilization) == 0.0 && row.value(revolving) == 0.0));
        result.add(combo(data, classAttribute, baseChurnRate,
                "Total_Ct_Chng_Q4_Q1 < 0.5",
                row -> present(row, countChange) && row.value(countChange) < 0.5));
        result.add(combo(data, classAttribute, baseChurnRate,
                "Card_Category == Blue AND Total_Trans_Ct <= q1",
                row -> present(row, cardCategory, transCount)
                        && "Blue".equals(row.stringValue(cardCategory))
                        && row.value(transCount) <= transCountQ1));
        return result;
    }

    private static Map<String, Object> combo(
            Instances data,
            Attribute classAttribute,
            double baseChurnRate,
            String label,
            RowPredicate predicate) {
        int count = 0;
        int attrited = 0;
        for (Instance row : data) {
            if (!predicate.test(row)) continue;
            count++;
            if (isAttrited(row, classAttribute)) attrited++;
        }
        double churnRate = rate(attrited, count);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("label", label);
        result.put("count", count);
        result.put("attrited", attrited);
        result.put("churnRate", round(churnRate));
        result.put("liftVsBase", round(baseChurnRate == 0.0 ? 0.0 : churnRate / baseChurnRate));
        return result;
    }

    private static boolean present(Instance row, Attribute... attributes) {
        for (Attribute attribute : attributes) {
            if (row.isMissing(attribute)) return false;
        }
        return true;
    }

    private static double quartile(Instances data, Attribute attribute, double percentile) {
        double[] values = nonMissingValues(data, attribute);
        if (values.length == 0) {
            throw new IllegalStateException("No non-missing values for quartiles: " + attribute.name());
        }
        Arrays.sort(values);
        return percentile(values, percentile);
    }

    private static double[] nonMissingValues(Instances data, Attribute attribute) {
        double[] buffer = new double[data.numInstances()];
        int count = 0;
        for (Instance row : data) {
            if (!row.isMissing(attribute)) {
                buffer[count++] = row.value(attribute);
            }
        }
        return Arrays.copyOf(buffer, count);
    }

    private static double percentile(double[] sortedValues, double percentile) {
        if (sortedValues.length == 1) return sortedValues[0];
        double index = percentile * (sortedValues.length - 1);
        int lower = (int) Math.floor(index);
        int upper = (int) Math.ceil(index);
        if (lower == upper) return sortedValues[lower];
        double fraction = index - lower;
        return sortedValues[lower] + fraction * (sortedValues[upper] - sortedValues[lower]);
    }

    private static List<Attribute> numericFeatures(Instances data) {
        List<Attribute> result = new ArrayList<>();
        for (int i = 0; i < data.numAttributes(); i++) {
            Attribute attribute = data.attribute(i);
            if (attribute.isNumeric() && !CLIENT_ID.equals(attribute.name())) {
                result.add(attribute);
            }
        }
        return result;
    }

    private static Attribute requireAttribute(Instances data, String name) {
        Attribute attribute = data.attribute(name);
        if (attribute == null) {
            throw new IllegalStateException("Required attribute not found: " + name);
        }
        return attribute;
    }

    private static Attribute requireNumericAttribute(Instances data, String name) {
        Attribute attribute = requireAttribute(data, name);
        if (!attribute.isNumeric()) {
            throw new IllegalStateException("Expected numeric attribute: " + name);
        }
        return attribute;
    }

    private static int countAttrited(Instances data, Attribute classAttribute) {
        int count = 0;
        for (Instance row : data) {
            if (isAttrited(row, classAttribute)) count++;
        }
        return count;
    }

    private static boolean isAttrited(Instance row, Attribute classAttribute) {
        return !row.isMissing(classAttribute) && ATTRITED.equals(row.stringValue(classAttribute));
    }

    private static double rate(double numerator, double denominator) {
        return denominator == 0.0 ? 0.0 : numerator / denominator;
    }

    private static double round(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return Math.round(value * 10000.0) / 10000.0;
    }

    private static void printConsoleSummary(
            int rows,
            int attrited,
            double baseChurnRate,
            Map<String, List<Map<String, Object>>> churnByBucket) {
        List<BucketSummary> eligible = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> dimension : churnByBucket.entrySet()) {
            for (Map<String, Object> bucket : dimension.getValue()) {
                int count = ((Number) bucket.get("count")).intValue();
                if (count >= 200) {
                    eligible.add(new BucketSummary(
                            dimension.getKey(),
                            bucket.get("bucket").toString(),
                            count,
                            ((Number) bucket.get("attrited")).intValue(),
                            ((Number) bucket.get("churnRate")).doubleValue(),
                            ((Number) bucket.get("liftVsBase")).doubleValue()));
                }
            }
        }
        eligible.sort(Comparator.comparingDouble(BucketSummary::liftVsBase).reversed());

        System.out.println();
        System.out.println("=== PHASE 9 INSIGHT FACTS SUMMARY ===");
        System.out.printf(Locale.ROOT, "Overall: rows=%d attrited=%d churnRate=%.4f%n",
                rows, attrited, baseChurnRate);
        System.out.println("Top 5 buckets by liftVsBase (count >= 200):");
        System.out.printf("%-28s %-24s %7s %9s %10s %10s%n",
                "Dimension", "Bucket", "Count", "Attrited", "ChurnRate", "Lift");
        System.out.println("-".repeat(94));
        for (BucketSummary bucket : eligible.stream().limit(5).toList()) {
            System.out.printf(Locale.ROOT, "%-28s %-24s %7d %9d %10.4f %10.4f%n",
                    bucket.dimension, bucket.bucket, bucket.count, bucket.attrited,
                    bucket.churnRate, bucket.liftVsBase);
        }
        System.out.println();
    }

    @FunctionalInterface
    private interface RowPredicate {
        boolean test(Instance row);
    }

    private static final class BucketCount {
        private int count;
        private int attrited;
    }

    private static final class ClusterAccumulator {
        private static final List<String> MEAN_FEATURES = List.of(
                "Credit_Limit", "Avg_Utilization_Ratio", "Total_Trans_Amt",
                "Total_Trans_Ct", "Total_Revolving_Bal", "Risk_Score");

        private int size;
        private int attrited;
        private final Map<String, Double> sums = new LinkedHashMap<>();
        private final Map<String, Integer> counts = new LinkedHashMap<>();

        private void add(Instance row, Attribute classAttribute, Instances data) {
            size++;
            if (isAttrited(row, classAttribute)) attrited++;
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
            String feature, double existingMean, double attritedMean, double ratio) {
    }

    private record Correlation(String feature, double value) {
    }

    private record BucketSummary(
            String dimension,
            String bucket,
            int count,
            int attrited,
            double churnRate,
            double liftVsBase) {
    }
}
