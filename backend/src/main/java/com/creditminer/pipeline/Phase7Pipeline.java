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
 *   <li>Discretize 6 numerics (3 equal-frequency bins) via {@link AssociationService#discretizeForApriori}</li>
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
        // Drop unused — keeps only the 13 attrs in APRIORI_KEEP
        Instances assocData = svc.retainKeepCols(discretized);

        // BE-71: save clean_assoc.arff
        loader.saveArff(assocData, assocArff);

        // BE-72: Apriori
        Apriori apriori = svc.runApriori(assocData);

        // BE-73: extract + filter
        List<RuleRecord> rules = svc.extractRules(apriori, assocData.numInstances(), MIN_LIFT);

        // BE-74: rules.json
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("totalRows", assocData.numInstances());
        doc.put("config", Map.of(
                "minSupport", 0.05,
                "minConfidence", 0.7,
                "numRules", 50,
                "minLift", MIN_LIFT
        ));
        doc.put("ruleCount", rules.size());
        doc.put("churnRuleCount", rules.stream().filter(r -> "churn".equals(r.category())).count());
        doc.put("retentionRuleCount", rules.stream().filter(r -> "retention".equals(r.category())).count());

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

        printConsoleSummary(rules);
        log.info("=== Phase 7 DONE ===");
    }

    private static void printConsoleSummary(List<RuleRecord> rules) {
        System.out.println();
        System.out.println("=== PHASE 7 SUMMARY ===");
        System.out.printf("Rules: %d total (churn=%d, retention=%d)%n",
                rules.size(),
                rules.stream().filter(r -> "churn".equals(r.category())).count(),
                rules.stream().filter(r -> "retention".equals(r.category())).count());
        System.out.println();
        System.out.printf("%-3s %-9s %7s %7s %7s  %-50s ==> %s%n",
                "#", "Category", "Sup", "Conf", "Lift", "LHS", "RHS");
        System.out.println("-".repeat(140));
        int i = 1;
        for (RuleRecord r : rules) {
            System.out.printf("%-3d %-9s %7.4f %7.4f %7.4f  %-50s ==> %s%n",
                    i++, r.category(), r.support(), r.confidence(), r.lift(),
                    truncate(r.lhs(), 50), r.rhs());
        }
        System.out.println();
    }

    private static String truncate(String s, int len) {
        if (s == null) return "";
        return s.length() > len ? s.substring(0, len - 3) + "..." : s;
    }
}
