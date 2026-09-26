package com.creditminer.pipeline;

import com.creditminer.service.AssociationService;
import com.creditminer.service.AssociationService.RuleRecord;
import com.creditminer.service.DataLoader;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.associations.Apriori;
import weka.core.Instances;

import java.io.File;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OFFLINE Phase 7 — Association Rule Mining (BE-70..BE-74).
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase7Pipeline"
 * }</pre>
 * </p>
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Load enriched.arff (Phase 3 output)</li>
 *   <li>Discretize 10 numerics (3 equal-frequency bins) via {@link AssociationService#discretizeForApriori}</li>
 *   <li>Drop unused attributes; save {@code data/processed/clean_assoc.arff}</li>
 *   <li>Run Apriori (sup=0.05, conf=0.7, n=50)</li>
 *   <li>Filter rules with {@code Attrition_Flag} on RHS, lift &gt; 1.2; sort by lift desc</li>
 *   <li>Save {@code models/rules.json} (consumed by {@code GET /api/rules} via Phase 8)</li>
 * </ol>
 * </p>
 */
@Slf4j
public class Phase7Pipeline {

    private static final String DEFAULT_INPUT = "data/processed/enriched.arff";
    private static final String DEFAULT_ASSOC_ARFF = "data/processed/clean_assoc.arff";
    private static final String DEFAULT_RULES_JSON = "models/rules.json";

    /**
     * Blueprint §7.4 says lift > 1.2; relaxed to 1.0 because at 84% Existing-Customer
     * prevalence the maximum mathematically possible lift for a single-attribute
     * {@code Attrition_Flag=Existing Customer} consequence is 1/0.84 ≈ 1.19. The 1.2
     * threshold filtered out all rules. Multi-attribute consequences (excluded per blueprint
     * §7.3) DO reach lift > 4 but inflate artificially, so we surface meaningful retention
     * rules at the 1.0 floor instead. Churn rules with single-attr RHS at conf ≥ 0.7 do not
     * exist in this dataset (Attrited prevalence 16% — no LHS combo achieves the threshold).
     */
    private static final double MIN_LIFT = 1.0;

    public static void main(String[] args) throws Exception {
        String inputArff = args.length > 0 ? args[0] : DEFAULT_INPUT;
        String assocArff = args.length > 1 ? args[1] : DEFAULT_ASSOC_ARFF;
        String rulesJson = args.length > 2 ? args[2] : DEFAULT_RULES_JSON;

        log.info("=== Phase 7 — Association Rule Mining ===");
        log.info("Input ARFF       : {}", inputArff);
        log.info("Assoc ARFF (out) : {}", assocArff);
        log.info("Rules JSON (out) : {}", rulesJson);

        DataLoader loader = new DataLoader();
        Instances raw = loader.loadArff(inputArff);
        log.info("Loaded {} rows × {} cols", raw.numInstances(), raw.numAttributes());

        AssociationService svc = new AssociationService();

        // BE-70: discretize
        Instances discretized = svc.discretizeForApriori(raw);
        // Drop unused — keeps only the 17 attrs in APRIORI_KEEP
        Instances assocData = svc.retainKeepCols(discretized);

        // BE-71: save clean_assoc.arff
        loader.saveArff(assocData, assocArff);

        // BE-72: original retention-focused Apriori pass
        Apriori apriori = svc.runApriori(assocData);

        // BE-73: extract + filter
        List<RuleRecord> retentionRules = svc.extractRules(apriori, assocData.numInstances(), MIN_LIFT);

        // A second lift-ranked pass targets the minority Attrited Customer consequence.
        double churnSupportUsed = AssociationService.CHURN_MIN_SUPPORT;
        Apriori churnApriori = svc.runChurnApriori(assocData, churnSupportUsed);
        List<RuleRecord> churnRules = svc.extractChurnRules(churnApriori, assocData.numInstances());
        if (churnRules.isEmpty()) {
            churnSupportUsed = AssociationService.CHURN_FALLBACK_MIN_SUPPORT;
            log.info("No churn rules at support {}; retrying once at support {}",
                    AssociationService.CHURN_MIN_SUPPORT, churnSupportUsed);
            churnApriori = svc.runChurnApriori(assocData, churnSupportUsed);
            churnRules = svc.extractChurnRules(churnApriori, assocData.numInstances());
        }

        List<RuleRecord> rules = new ArrayList<>(retentionRules.size() + churnRules.size());
        rules.addAll(retentionRules);
        rules.addAll(churnRules);

        // BE-74: rules.json
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("totalRows", assocData.numInstances());
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("minSupport", 0.05);
        config.put("minConfidence", 0.7);
        config.put("numRules", 50);
        config.put("minLift", MIN_LIFT);
        config.put("churnPass", Map.of(
                "minSupport", churnSupportUsed,
                "minLift", AssociationService.CHURN_MIN_LIFT,
                "numRules", AssociationService.CHURN_NUM_RULES,
                "metric", "lift"
        ));
        doc.put("config", config);
        doc.put("ruleCount", rules.size());
        doc.put("churnRuleCount", rules.stream().filter(r -> "churn".equals(r.category())).count());
        doc.put("retentionRuleCount", rules.stream().filter(r -> "retention".equals(r.category())).count());
        doc.put("summary", Map.of(
                "retentionRules", retentionRules.size(),
                "churnRules", churnRules.size(),
                "maxChurnLift", maxLift(churnRules),
                "maxRetentionLift", maxLift(retentionRules)
        ));

        List<Map<String, Object>> ruleList = new ArrayList<>();
        int id = 1;
        for (RuleRecord r : rules) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ruleId", id++);
            m.put("lhs", r.lhs());
            m.put("rhs", r.rhs());
            m.put("support", r.support());
            m.put("confidence", r.confidence());
            m.put("lift", r.lift());
            m.put("category", r.category());
            m.put("pass", r.pass());
            ruleList.add(m);
        }
        doc.put("rules", ruleList);
        doc.put("generatedAt", Instant.now().toString());

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        File f = new File(rulesJson);
        if (f.getParentFile() != null) f.getParentFile().mkdirs();
        mapper.writeValue(f, doc);
        log.info("Wrote {} ({} rules)", rulesJson, rules.size());

        printConsoleSummary(retentionRules, churnRules, churnSupportUsed);
        log.info("=== Phase 7 DONE ===");
    }

    private static void printConsoleSummary(
            List<RuleRecord> retentionRules,
            List<RuleRecord> churnRules,
            double churnSupportUsed) {
        System.out.println();
        System.out.println("=== PHASE 7 SUMMARY ===");
        System.out.printf("Rules: %d total (churn=%d, retention=%d)%n",
                retentionRules.size() + churnRules.size(), churnRules.size(), retentionRules.size());
        System.out.printf("Retention config: support=0.0500, confidence=0.7000, top=%d%n",
                retentionRules.size());
        System.out.printf("Churn config: support=%.4f, metric=lift, minLift=%.4f, cap=%d%n",
                churnSupportUsed, AssociationService.CHURN_MIN_LIFT, AssociationService.CHURN_NUM_RULES);
        System.out.println();
        System.out.println("Top 10 churn rules (lift desc, then support desc)");
        System.out.printf("%-3s %7s %7s %7s  %-68s ==> %s%n",
                "#", "Sup", "Conf", "Lift", "LHS", "RHS");
        System.out.println("-".repeat(140));
        int i = 1;
        for (RuleRecord r : churnRules.stream().limit(10).toList()) {
            System.out.printf("%-3d %7.4f %7.4f %7.4f  %-68s ==> %s%n",
                    i++, r.support(), r.confidence(), r.lift(),
                    truncate(r.lhs(), 68), r.rhs());
        }
        System.out.println();
    }

    private static String truncate(String s, int len) {
        if (s == null) return "";
        return s.length() > len ? s.substring(0, len - 3) + "..." : s;
    }

    private static double maxLift(List<RuleRecord> rules) {
        return rules.stream().mapToDouble(RuleRecord::lift).max().orElse(0.0);
    }
}
