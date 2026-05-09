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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Phase 8 — Database seeder (BE-81).
 *
 * <p>Run via {@code Phase8Seeder} standalone main. Reads:
 * <ul>
 *   <li>{@code enriched.arff} — 10127 customers</li>
 *   <li>{@code phase6_pca_2d.json} — cluster assignment per CLIENTNUM</li>
 *   <li>{@code phase6_anomalies.json} — phase2/cluster outlier flags + combined isAnomaly</li>
 *   <li>{@code phase6_clusters.json} — 3 cluster summaries (centroid + avgRisk + churnRate)</li>
 *   <li>{@code rules.json} — 50 association rules</li>
 * </ul>
 * </p>
 *
 * <p>Persona names are mapped here (offline, before seeding) so the {@code clusters}
 * table holds business-friendly labels. Confirm these with the user before re-running.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseSeeder {

    private final CustomerRepository customerRepo;
    private final ClusterRepository clusterRepo;
    private final RuleRepository ruleRepo;
    private final DataLoader dataLoader;

    @Value("${creditminer.data.enriched-arff}")
    private String enrichedArffPath;

    @Value("${creditminer.data.phase6-clusters-json:data/processed/phase6_clusters.json}")
    private String clustersJsonPath;

    @Value("${creditminer.data.phase6-anomalies-json:data/processed/phase6_anomalies.json}")
    private String anomaliesJsonPath;

    @Value("${creditminer.data.phase6-pca-json:data/processed/phase6_pca_2d.json}")
    private String pcaJsonPath;

    @Value("${creditminer.models.rules-json}")
    private String rulesJsonPath;

    /** Cluster id → human-readable persona name. Confirm before seeding production. */
    private static final Map<Integer, String> PERSONA_NAMES = Map.of(
            0, "Premium Loyal",
            1, "At-Risk Mid-Tier",
            2, "Low-Income Stable"
    );

    /** Anomaly record fields parsed from {@code phase6_anomalies.json}. */
    private record AnomalyFlags(boolean phase2Outlier, boolean clusterMildOutlier,
                                boolean clusterStrongOutlier, boolean isAnomaly) {}

    @Transactional
    public void seed() throws Exception {
        log.info("=== DatabaseSeeder.seed() ===");
        seedClusters();
        seedRules();
        seedCustomers();
        log.info("=== Seeding complete ===");
    }

    // -------------------- clusters --------------------

    private void seedClusters() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        File f = new File(clustersJsonPath);
        if (!f.exists()) {
            log.warn("Cluster JSON missing at {} — skipping", clustersJsonPath);
            return;
        }
        JsonNode arr = mapper.readTree(f);
        clusterRepo.deleteAllInBatch();
        clusterRepo.flush();
        List<Cluster> rows = new ArrayList<>();
        for (JsonNode n : arr) {
            int cid = n.get("clusterId").asInt();
            String persona = PERSONA_NAMES.getOrDefault(cid, "Cluster " + cid);
            rows.add(Cluster.builder()
                    .clusterId(cid)
                    .personaName(persona)
                    .size(n.get("size").asInt())
                    .centroidJson(n.get("centroid").toString())
                    .avgRisk(toBigDecimal(n.get("avgRisk").asDouble(), 3))
                    .churnRate(toBigDecimal(n.get("churnRate").asDouble(), 3))
                    .description(n.get("description").asText())
                    .build());
        }
        clusterRepo.saveAll(rows);
        log.info("Seeded {} clusters", rows.size());
    }

    // -------------------- rules --------------------

    private void seedRules() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        File f = new File(rulesJsonPath);
        if (!f.exists()) {
            log.warn("Rules JSON missing at {} — skipping", rulesJsonPath);
            return;
        }
        JsonNode root = mapper.readTree(f);
        JsonNode arr = root.get("rules");
        if (arr == null || !arr.isArray()) {
            log.warn("Rules JSON has no 'rules' array — skipping");
            return;
        }
        ruleRepo.deleteAllInBatch();
        ruleRepo.flush();
        List<Rule> rows = new ArrayList<>();
        for (JsonNode n : arr) {
            rows.add(Rule.builder()
                    .lhs(n.get("lhs").asText())
                    .rhs(n.get("rhs").asText())
                    .support(toBigDecimal(n.get("support").asDouble(), 4))
                    .confidence(toBigDecimal(n.get("confidence").asDouble(), 4))
                    .lift(toBigDecimal(n.get("lift").asDouble(), 4))
                    .category(n.get("category").asText())
                    .build());
        }
        ruleRepo.saveAll(rows);
        log.info("Seeded {} rules", rows.size());
    }

    // -------------------- customers --------------------

    private void seedCustomers() throws Exception {
        Instances data = dataLoader.loadArff(enrichedArffPath);
        log.info("Loaded {} customer rows from {}", data.numInstances(), enrichedArffPath);

        Map<Long, Integer> clusterByClient = readClusterAssignments();
        Map<Long, AnomalyFlags> flagsByClient = readAnomalyFlags();

        customerRepo.deleteAllInBatch();
        customerRepo.flush();

        List<Customer> batch = new ArrayList<>(1000);
        int total = 0;
        Attribute clientAttr = data.attribute("CLIENTNUM");
        for (int i = 0; i < data.numInstances(); i++) {
            Instance inst = data.instance(i);
            long clientNum = (long) inst.value(clientAttr);
            AnomalyFlags flags = flagsByClient.getOrDefault(clientNum,
                    new AnomalyFlags(false, false, false, false));
            batch.add(Customer.builder()
                    .clientNum(clientNum)
                    .attritionFlag(nominalValue(inst, "Attrition_Flag"))
                    .customerAge(intValue(inst, "Customer_Age"))
                    .gender(nominalValue(inst, "Gender"))
                    .dependentCount(intValue(inst, "Dependent_count"))
                    .educationLevel(nominalValue(inst, "Education_Level"))
                    .maritalStatus(nominalValue(inst, "Marital_Status"))
                    .incomeCategory(nominalValue(inst, "Income_Category"))
                    .cardCategory(nominalValue(inst, "Card_Category"))
                    .monthsOnBook(intValue(inst, "Months_on_book"))
                    .totalRelationshipCount(intValue(inst, "Total_Relationship_Count"))
                    .monthsInactive12Mon(intValue(inst, "Months_Inactive_12_mon"))
                    .contactsCount12Mon(intValue(inst, "Contacts_Count_12_mon"))
                    .creditLimit(decimalValue(inst, "Credit_Limit", 2))
                    .totalRevolvingBal(decimalValue(inst, "Total_Revolving_Bal", 2))
                    .avgOpenToBuy(decimalValue(inst, "Avg_Open_To_Buy", 2))
                    .avgUtilizationRatio(decimalValue(inst, "Avg_Utilization_Ratio", 3))
                    .totalAmtChngQ4Q1(decimalValue(inst, "Total_Amt_Chng_Q4_Q1", 3))
                    .totalTransAmt(decimalValue(inst, "Total_Trans_Amt", 2))
                    .totalTransCt(intValue(inst, "Total_Trans_Ct"))
                    .totalCtChngQ4Q1(decimalValue(inst, "Total_Ct_Chng_Q4_Q1", 3))
                    .utilizationScore(decimalValue(inst, "Utilization_Score", 3))
                    .spendingIntensity(decimalValue(inst, "Spending_Intensity", 2))
                    .engagementScore(decimalValue(inst, "Engagement_Score", 3))
                    .customerValueScore(decimalValue(inst, "Customer_Value_Score", 3))
                    .riskScore(decimalValue(inst, "Risk_Score", 3))
                    .customerTier(nominalValue(inst, "Customer_Tier"))
                    .clusterId(clusterByClient.get(clientNum))
                    .isOutlier(flags.phase2Outlier())
                    .isAnomaly(flags.isAnomaly())
                    .build());
            if (batch.size() == 1000) {
                customerRepo.saveAll(batch);
                customerRepo.flush();
                total += batch.size();
                log.info("  ... {} customers seeded", total);
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            customerRepo.saveAll(batch);
            customerRepo.flush();
            total += batch.size();
        }
        log.info("Seeded {} customers", total);
    }

    private Map<Long, Integer> readClusterAssignments() throws Exception {
        Map<Long, Integer> out = new HashMap<>();
        File f = new File(pcaJsonPath);
        if (!f.exists()) {
            log.warn("PCA JSON missing at {} — clusterId will be null on all customers", pcaJsonPath);
            return out;
        }
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(f);
        JsonNode points = root.get("points");
        if (points == null || !points.isArray()) return out;
        for (JsonNode n : points) {
            out.put(n.get("clientNum").asLong(), n.get("clusterId").asInt());
        }
        log.info("Loaded cluster assignments for {} CLIENTNUMs", out.size());
        return out;
    }

    private Map<Long, AnomalyFlags> readAnomalyFlags() throws Exception {
        Map<Long, AnomalyFlags> out = new HashMap<>();
        File f = new File(anomaliesJsonPath);
        if (!f.exists()) {
            log.warn("Anomalies JSON missing at {} — outlier/anomaly flags will be false", anomaliesJsonPath);
            return out;
        }
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(f);
        JsonNode records = root.get("records");
        if (records == null || !records.isArray()) return out;
        for (JsonNode n : records) {
            JsonNode mildNode = n.get("clusterMildOutlier");
            JsonNode strongNode = n.get("clusterStrongOutlier");
            // Back-compat: old JSON used `clusterDistanceOutlier` (single threshold).
            JsonNode legacy = n.get("clusterDistanceOutlier");
            boolean mild = mildNode != null ? mildNode.asBoolean()
                    : (legacy != null && legacy.asBoolean());
            boolean strong = strongNode != null ? strongNode.asBoolean()
                    : (legacy != null && legacy.asBoolean());
            out.put(n.get("clientNum").asLong(),
                    new AnomalyFlags(
                            n.get("phase2Outlier").asBoolean(),
                            mild,
                            strong,
                            n.get("isAnomaly").asBoolean()));
        }
        log.info("Loaded anomaly flags for {} CLIENTNUMs", out.size());
        return out;
    }

    // -------------------- helpers --------------------

    private static String nominalValue(Instance inst, String name) {
        Attribute a = inst.dataset().attribute(name);
        if (a == null || inst.isMissing(a)) return null;
        return a.value((int) inst.value(a));
    }

    private static Integer intValue(Instance inst, String name) {
        Attribute a = inst.dataset().attribute(name);
        if (a == null || inst.isMissing(a)) return null;
        return (int) inst.value(a);
    }

    private static BigDecimal decimalValue(Instance inst, String name, int scale) {
        Attribute a = inst.dataset().attribute(name);
        if (a == null || inst.isMissing(a)) return null;
        return toBigDecimal(inst.value(a), scale);
    }

    private static BigDecimal toBigDecimal(double v, int scale) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return null;
        return BigDecimal.valueOf(v).setScale(scale, RoundingMode.HALF_UP);
    }
}
