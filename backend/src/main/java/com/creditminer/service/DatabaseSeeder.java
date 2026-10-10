package com.creditminer.service;

import com.creditminer.entity.Cluster;
import com.creditminer.entity.Customer;
import com.creditminer.entity.Rule;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.repository.RuleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Seeds a configured database from generated local artifacts. */
@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseSeeder {
    private final CustomerRepository customerRepo;
    private final ClusterRepository clusterRepo;
    private final RuleRepository ruleRepo;
    private final DataLoader dataLoader;

    @Value("${creditminer.data.enriched-arff}") private String enrichedArffPath;
    @Value("${creditminer.data.phase6-clusters-json:data/processed/phase6_clusters.json}")
    private String clustersJsonPath;
    @Value("${creditminer.data.phase6-anomalies-json:data/processed/phase6_anomalies.json}")
    private String anomaliesJsonPath;
    @Value("${creditminer.data.phase6-pca-json:data/processed/phase6_pca_2d.json}")
    private String pcaJsonPath;
    @Value("${creditminer.models.rules-json}") private String rulesJsonPath;

    private final ObjectMapper mapper = new ObjectMapper();

    private record AnomalyFlags(BigDecimal centroidDistance, boolean outlier, boolean anomaly) {}

    // Fail closed: a missing or malformed artifact throws, so the transaction rolls back the deletes.
    @Transactional(rollbackFor = Exception.class)
    public void seed() throws Exception {
        Instances data = dataLoader.loadArff(enrichedArffPath);
        Attribute idAttribute = data.attribute("ID");
        if (idAttribute == null) throw new IllegalStateException("ID attribute missing from enriched ARFF");

        List<Cluster> clusterRows = readClusters();
        List<Rule> ruleRows = readRules();
        Map<Long, Integer> clusterAssignments = readClusterAssignments();
        Map<Long, AnomalyFlags> anomalies = readAnomalyFlags();
        validateClusterCoverage(data, idAttribute, clusterAssignments, clusterRows);

        customerRepo.deleteAllInBatch();
        ruleRepo.deleteAllInBatch();
        clusterRepo.deleteAllInBatch();
        clusterRepo.saveAll(clusterRows);
        log.info("Seeded {} clusters", clusterRows.size());
        ruleRepo.saveAll(ruleRows);
        log.info("Seeded {} association rules", ruleRows.size());
        seedCustomers(data, idAttribute, clusterAssignments, anomalies);
    }

    private List<Cluster> readClusters() {
        JsonNode clusters = readRequiredJson(clustersJsonPath, "Cluster artifact");
        if (!clusters.isArray()) {
            throw new IllegalStateException("Cluster artifact root is not an array");
        }
        List<Cluster> rows = new ArrayList<>();
        Set<Integer> clusterIds = new HashSet<>();
        for (JsonNode node : clusters) {
            int id = requireInt(node, "clusterId", "Cluster record");
            if (!clusterIds.add(id)) {
                throw new IllegalStateException("Cluster artifact has duplicate clusterId " + id);
            }
            int size = requireInt(node, "size", "Cluster record");
            if (size <= 0) {
                throw new IllegalStateException("Cluster record size must be greater than zero");
            }
            rows.add(Cluster.builder()
                    .clusterId(id)
                    .personaName(optionalText(node, "personaName"))
                    .size(size)
                    .centroidJson(optionalJson(node, "centroid"))
                    .avgRisk(optionalDecimal(node, "avgRisk", 4, "Cluster record"))
                    .defaultRate(requireDecimal(node, "defaultRate", 4, "Cluster record"))
                    .description(optionalText(node, "description"))
                    .build());
        }
        return rows;
    }

    private List<Rule> readRules() {
        JsonNode root = readRequiredJson(rulesJsonPath, "Rule artifact");
        JsonNode rules = root.get("rules");
        if (rules == null || !rules.isArray()) {
            throw new IllegalStateException("Rule artifact has no rules array");
        }
        List<Rule> rows = new ArrayList<>();
        for (JsonNode node : rules) {
            rows.add(Rule.builder()
                    .lhs(requireNonEmptyText(node, "lhs", "Rule record"))
                    .rhs(requireNonEmptyText(node, "rhs", "Rule record"))
                    .support(requireDecimal(node, "support", 4, "Rule record"))
                    .confidence(requireDecimal(node, "confidence", 4, "Rule record"))
                    .lift(requireDecimal(node, "lift", 4, "Rule record"))
                    .category(requireNonEmptyText(node, "category", "Rule record"))
                    .build());
        }
        return rows;
    }

    private void seedCustomers(
            Instances data,
            Attribute idAttribute,
            Map<Long, Integer> clusters,
            Map<Long, AnomalyFlags> anomalies) {
        List<Customer> batch = new ArrayList<>(1000);
        int total = 0;
        for (Instance row : data) {
            long id = customerId(row, idAttribute);
            AnomalyFlags flags = anomalies.getOrDefault(id, new AnomalyFlags(null, false, false));
            batch.add(Customer.builder()
                    .clientId(id)
                    .limitBal(decimalValue(row, "LIMIT_BAL", 2))
                    .sex(nominalValue(row, "SEX"))
                    .education(nominalValue(row, "EDUCATION"))
                    .marriage(nominalValue(row, "MARRIAGE"))
                    .age(intValue(row, "AGE"))
                    .pay1(intValue(row, "PAY_1")).pay2(intValue(row, "PAY_2"))
                    .pay3(intValue(row, "PAY_3")).pay4(intValue(row, "PAY_4"))
                    .pay5(intValue(row, "PAY_5")).pay6(intValue(row, "PAY_6"))
                    .billAmt1(decimalValue(row, "BILL_AMT1", 2)).billAmt2(decimalValue(row, "BILL_AMT2", 2))
                    .billAmt3(decimalValue(row, "BILL_AMT3", 2)).billAmt4(decimalValue(row, "BILL_AMT4", 2))
                    .billAmt5(decimalValue(row, "BILL_AMT5", 2)).billAmt6(decimalValue(row, "BILL_AMT6", 2))
                    .payAmt1(decimalValue(row, "PAY_AMT1", 2)).payAmt2(decimalValue(row, "PAY_AMT2", 2))
                    .payAmt3(decimalValue(row, "PAY_AMT3", 2)).payAmt4(decimalValue(row, "PAY_AMT4", 2))
                    .payAmt5(decimalValue(row, "PAY_AMT5", 2)).payAmt6(decimalValue(row, "PAY_AMT6", 2))
                    .defaultFlag(nominalValue(row, "Default"))
                    .utilization1(decimalValue(row, "UTILIZATION_1", 5))
                    .avgUtilization(decimalValue(row, "AVG_UTILIZATION", 5))
                    .payRatio(decimalValue(row, "PAY_RATIO", 5))
                    .monthsDelayed(intValue(row, "MONTHS_DELAYED"))
                    .maxDelay(intValue(row, "MAX_DELAY"))
                    .billTrend(decimalValue(row, "BILL_TREND", 5))
                    .riskTier(nominalValue(row, "RISK_TIER"))
                    .clusterId(clusters.get(id))
                    .centroidDistance(flags.centroidDistance())
                    .isOutlier(flags.outlier())
                    .isAnomaly(flags.anomaly())
                    .build());
            if (batch.size() == 1000) {
                customerRepo.saveAll(batch);
                total += batch.size();
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            customerRepo.saveAll(batch);
            total += batch.size();
        }
        customerRepo.flush();
        if (total != data.numInstances()) {
            throw new IllegalStateException(
                    "Seeded customer count " + total + " does not match enriched ARFF rows " + data.numInstances());
        }
        log.info("Seeded {} customers (enriched ARFF rows: {})", total, data.numInstances());
    }

    private Map<Long, Integer> readClusterAssignments() {
        Map<Long, Integer> result = new HashMap<>();
        JsonNode root = readRequiredJson(pcaJsonPath, "PCA artifact");
        JsonNode points = root.get("points");
        if (points == null || !points.isArray()) {
            throw new IllegalStateException("PCA artifact has no points array");
        }
        for (JsonNode node : points) {
            long clientId = requireLong(node, "clientId", "PCA point");
            int clusterId = requireInt(node, "clusterId", "PCA point");
            if (result.put(clientId, clusterId) != null) {
                throw new IllegalStateException("PCA artifact has duplicate clientId " + clientId);
            }
        }
        return result;
    }

    private Map<Long, AnomalyFlags> readAnomalyFlags() {
        Map<Long, AnomalyFlags> result = new HashMap<>();
        JsonNode root = readRequiredJson(anomaliesJsonPath, "Anomaly artifact");
        JsonNode records = root.get("records");
        if (records == null || !records.isArray()) {
            throw new IllegalStateException("Anomaly artifact has no records array");
        }
        for (JsonNode node : records) {
            long clientId = requireLong(node, "clientId", "Anomaly record");
            BigDecimal centroidDistance = requireDecimal(
                    node, "centroidDistance", 4, "Anomaly record");
            boolean phase2Outlier = requireBoolean(node, "phase2Outlier", "Anomaly record");
            requireBoolean(node, "clusterMildOutlier", "Anomaly record");
            requireBoolean(node, "clusterStrongOutlier", "Anomaly record");
            boolean isAnomaly = requireBoolean(node, "isAnomaly", "Anomaly record");
            if (result.put(clientId, new AnomalyFlags(centroidDistance, phase2Outlier, isAnomaly)) != null) {
                throw new IllegalStateException("Anomaly artifact has duplicate clientId " + clientId);
            }
        }
        return result;
    }

    private static void validateClusterCoverage(
            Instances data,
            Attribute idAttribute,
            Map<Long, Integer> assignments,
            List<Cluster> clusters) {
        int missing = 0;
        int duplicates = 0;
        Set<Long> customerIds = new HashSet<>();
        Set<Integer> clusterIds = new HashSet<>();
        for (Cluster cluster : clusters) clusterIds.add(cluster.getClusterId());
        long orphanAssignments = assignments.values().stream()
                .filter(clusterId -> !clusterIds.contains(clusterId))
                .count();
        if (orphanAssignments > 0) {
            throw new IllegalStateException(
                    "PCA artifact has " + orphanAssignments + " assignments to undefined clusters");
        }
        for (Instance row : data) {
            long id = customerId(row, idAttribute);
            if (!customerIds.add(id)) duplicates++;
            if (!assignments.containsKey(id)) missing++;
        }
        if (duplicates > 0) {
            throw new IllegalStateException(
                    "Duplicate client IDs in enriched ARFF: " + duplicates + " rows");
        }
        if (missing > 0) {
            throw new IllegalStateException(
                    "Missing cluster assignments for " + missing + " customer rows in enriched ARFF");
        }
    }

    private static long customerId(Instance row, Attribute idAttribute) {
        if (row.isMissing(idAttribute)) {
            throw new IllegalStateException("Customer ID is missing in enriched ARFF");
        }
        double value = row.value(idAttribute);
        if (!Double.isFinite(value)
                || value != Math.rint(value)
                || value < -0x1p63
                || value >= 0x1p63) {
            throw new IllegalStateException(
                    "Customer ID must be a finite 64-bit whole number in enriched ARFF: " + value);
        }
        return (long) value;
    }

    private JsonNode readRequiredJson(String path, String label) {
        File file = new File(path);
        if (!file.isFile()) {
            throw new IllegalStateException(label + " missing at " + path);
        }
        try {
            JsonNode root = mapper.readTree(file);
            if (root == null) throw new IllegalStateException(label + " is empty at " + path);
            return root;
        } catch (IOException ex) {
            throw new IllegalStateException(label + " is malformed at " + path, ex);
        }
    }

    private static int requireInt(JsonNode node, String field, String label) {
        if (!node.has(field)) {
            throw new IllegalStateException(label + " field '" + field + "' is missing");
        }
        JsonNode value = node.get(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt()) {
            throw new IllegalStateException(label + " field '" + field + "' must be an integer");
        }
        return value.intValue();
    }

    private static long requireLong(JsonNode node, String field, String label) {
        if (!node.has(field)) {
            throw new IllegalStateException(label + " field '" + field + "' is missing");
        }
        JsonNode value = node.get(field);
        if (!value.isIntegralNumber() || !value.canConvertToLong()) {
            throw new IllegalStateException(
                    label + " field '" + field + "' must be a 64-bit integer");
        }
        return value.longValue();
    }

    private static boolean requireBoolean(JsonNode node, String field, String label) {
        if (!node.has(field)) {
            throw new IllegalStateException(label + " field '" + field + "' is missing");
        }
        JsonNode value = node.get(field);
        if (!value.isBoolean()) {
            throw new IllegalStateException(label + " field '" + field + "' must be boolean");
        }
        return value.booleanValue();
    }

    private static String requireNonEmptyText(JsonNode node, String field, String label) {
        if (!node.has(field)) {
            throw new IllegalStateException(label + " field '" + field + "' is missing");
        }
        JsonNode value = node.get(field);
        if (!value.isTextual() || value.textValue().isBlank()) {
            throw new IllegalStateException(label + " field '" + field + "' must be non-empty text");
        }
        return value.textValue();
    }

    private static BigDecimal requireDecimal(
            JsonNode node, String field, int scale, String label) {
        if (!node.has(field)) {
            throw new IllegalStateException(label + " field '" + field + "' is missing");
        }
        JsonNode value = node.get(field);
        if (!value.isNumber()) {
            throw new IllegalStateException(label + " field '" + field + "' must be numeric");
        }
        return value.decimalValue().setScale(scale, RoundingMode.HALF_UP);
    }

    private static BigDecimal optionalDecimal(
            JsonNode node, String field, int scale, String label) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isNumber()) {
            throw new IllegalStateException(label + " field '" + field + "' must be numeric when present");
        }
        return value.decimalValue().setScale(scale, RoundingMode.HALF_UP);
    }

    private static String optionalText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isTextual()) {
            throw new IllegalStateException("Cluster record field '" + field + "' must be text when present");
        }
        return value.textValue();
    }

    private static String optionalJson(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isObject()) {
            throw new IllegalStateException("Cluster record field '" + field + "' must be an object when present");
        }
        return value.toString();
    }

    private static String nominalValue(Instance row, String name) {
        Attribute attribute = row.dataset().attribute(name);
        if (attribute == null || row.isMissing(attribute)) return null;
        return attribute.value((int) row.value(attribute));
    }

    private static Integer intValue(Instance row, String name) {
        Attribute attribute = row.dataset().attribute(name);
        return attribute == null || row.isMissing(attribute) ? null : (int) row.value(attribute);
    }

    private static BigDecimal decimalValue(Instance row, String name, int scale) {
        Attribute attribute = row.dataset().attribute(name);
        return attribute == null || row.isMissing(attribute) ? null : decimal(row.value(attribute), scale);
    }

    private static BigDecimal decimal(double value, int scale) {
        return Double.isFinite(value)
                ? BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP) : null;
    }
}
