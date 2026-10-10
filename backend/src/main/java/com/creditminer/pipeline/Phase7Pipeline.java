package com.creditminer.pipeline;

import com.creditminer.service.AssociationService;
import com.creditminer.service.AssociationService.RuleRecord;
import com.creditminer.service.AssociationService.TargetRuleSearch;
import com.creditminer.service.DataLoader;
import com.creditminer.service.RuleNaming;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Instances;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Offline Phase 7 association-rule pipeline for payment-default outcomes. */
@Slf4j
public class Phase7Pipeline {

    private static final String DEFAULT_INPUT = "data/processed/enriched.arff";
    private static final String DEFAULT_ASSOC_ARFF = "data/processed/clean_assoc.arff";
    private static final String DEFAULT_RULES_JSON = "models/rules.json";

    public static void main(String[] args) throws Exception {
        String inputArff = args.length > 0 ? args[0] : DEFAULT_INPUT;
        String assocArff = args.length > 1 ? args[1] : DEFAULT_ASSOC_ARFF;
        String rulesJson = args.length > 2 ? args[2] : DEFAULT_RULES_JSON;

        long started = System.nanoTime();
        log.info("=== Phase 7 - Association Rule Mining ===");
        Instances raw;
        try (var reader = Files.newBufferedReader(Path.of(inputArff))) {
            raw = new Instances(reader);
        }

        AssociationService service = new AssociationService();
        Instances associationData = service.prepareForApriori(raw);


        List<RuleRecord> originalNonDefault = service.findNonDefaultRules(associationData);
        AssociationService relaxedService = new AssociationService();
        List<RuleRecord> relaxedNonDefault = relaxedService.findRelaxedNonDefaultRules(associationData);
        var selection = AssociationService.selectNonDefaultRules(originalNonDefault, relaxedNonDefault);
        List<RuleRecord> nonDefaultRules = selection.rules();
        TargetRuleSearch targetSearch = service.findDefaultRules(
                associationData, AssociationService.DEFAULT_SUPPORT_STEPS);
        List<RuleRecord> defaultRules = targetSearch.rules();

        double runtimeSeconds = (System.nanoTime() - started) / 1_000_000_000.0;
        if (runtimeSeconds > 600 || defaultRules.size() < 8 || nonDefaultRules.size() < 6) {
            throw new IllegalStateException("Phase7 gate: seconds=" + runtimeSeconds + "; pruning=" + service.pruningCounts());
        }
        new DataLoader().saveArff(associationData, assocArff);
        List<RuleRecord> rules = new ArrayList<>(defaultRules.size() + nonDefaultRules.size());
        rules.addAll(defaultRules);
        rules.addAll(nonDefaultRules);

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("totalRows", associationData.numInstances());
        document.put("discretization", service.discretizationMetadata(associationData));
        document.put("baseline", Map.of("defaultRate", AssociationService.targetRate(associationData, "Yes"),
                "totalRows", associationData.numInstances()));
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("minSupport", .02);
        config.put("minConfidence", selection.minConfidence());
        config.put("numRules", 15);
        config.put("minLift", selection.minLift());
        config.put("defaultPass", Map.of("minSupport", .01, "upperSupport", 1.0, "minConfidence", .30,
                "minLift", 1.25, "numRules", defaultRules.size(), "metric", "confidence"));
        config.put("nonDefaultPass", Map.of("minSupport", .02, "upperSupport", 1.0, "minConfidence", selection.minConfidence(),
                "minLift", selection.minLift(), "numRules", nonDefaultRules.size(), "metric", "confidence"));
        config.put("apriori", Map.of("classIndex", "last", "metricType", 0, "numRulesPerSubset", 10000, "delta", .05));
        config.put("views", Map.of("repayment", AssociationService.REPAYMENT, "other", AssociationService.OTHER,
                "subsets", "one repayment x one other, plus all single attributes", "maxPremiseAttributes", 2));
        config.put("pruningSteps", List.of("identical antecedent coverage: shortest first",
                "two-item confidence improvement >= 0.02 over best singleton (including unmined subrules)",
                "one representative per family: shortest antecedent, then highest lift, then support; retain qualifying variants as familyMembers",
                "top 15 default; top 12 relaxed non-default when >=8 families, else original; never pad"));
        boolean useRelaxed = "relaxed".equals(selection.pass());
        AssociationService selectedService = useRelaxed ? relaxedService : service;
        List<RuleRecord> familyMembers = new ArrayList<>(service.familyMembers("default", defaultRules));
        familyMembers.addAll(selectedService.familyMembers("non-default", nonDefaultRules));
        Map<String, Map<String, Integer>> selectedCounts = new LinkedHashMap<>(service.pruningCounts());
        Map<String, Integer> nonDefaultCounts = new LinkedHashMap<>(selectedService.pruningCounts().get("non-default"));
        nonDefaultCounts.put("afterPublicationLimit", nonDefaultRules.size());
        selectedCounts.put("non-default", nonDefaultCounts);
        config.put("pruningCounts", selectedCounts);
        Map<String, Map<String, Object>> selectedSubsets = new LinkedHashMap<>(service.subsetRuns());
        if (useRelaxed) selectedSubsets.putAll(relaxedService.subsetRuns());
        config.put("subsetRuns", selectedSubsets);
        config.put("publicationGate", Map.of("minDefault", 8, "minNonDefault", 6));
        config.put("nonDefaultComparison", Map.of(
                "original", Map.of("minConfidence", .85, "minLift", 1.08,
                        "familyCount", service.pruningCounts().get("non-default").get("afterFamily"),
                        "pruningCounts", service.pruningCounts().get("non-default"),
                        "subsetRuns", service.subsetRuns().entrySet().stream().filter(e -> e.getKey().startsWith("No:"))
                                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue))),
                "relaxed", Map.of("minConfidence", .82, "minLift", 1.05,
                        "familyCount", relaxedService.pruningCounts().get("non-default").get("afterFamily"),
                        "pruningCounts", relaxedService.pruningCounts().get("non-default"),
                        "subsetRuns", relaxedService.subsetRuns()),
                "selected", selection.pass(), "publishedCount", nonDefaultRules.size(),
                "selectionRule", "Use relaxed only when at least 8 families survive; cap relaxed at 12; otherwise retain original"));
        config.put("method", "class-association rules with at most two antecedent items (Weka Apriori; exhaustive count for the fallback)");
        config.put("runtimeSeconds", runtimeSeconds);
        document.put("config", config);
        document.put("ruleCount", rules.size());
        document.put("defaultRuleCount", defaultRules.size());
        document.put("nonDefaultRuleCount", nonDefaultRules.size());
        document.put("summary", Map.of(
                "defaultRules", defaultRules.size(),
                "nonDefaultRules", nonDefaultRules.size(),
                "maxDefaultLift", maxLift(defaultRules),
                "maxNonDefaultLift", maxLift(nonDefaultRules),
                "finalDefaultSupport", targetSearch.finalSupport()));
        document.put("rules", ruleMaps(rules));
        document.put("familyMemberCount", familyMembers.size());
        document.put("familyMembers", ruleMaps(familyMembers, rules.size() + 1));
        document.put("generatedAt", Instant.now().toString());

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        File output = new File(rulesJson);
        if (output.getParentFile() != null) output.getParentFile().mkdirs();
        mapper.writeValue(output, document);

        printSummary(defaultRules, nonDefaultRules, targetSearch);
        System.out.printf("Non-default comparison: original=%d, relaxed=%d; selected=%s, published=%d%n",
                originalNonDefault.size(), relaxedNonDefault.size(), selection.pass(), nonDefaultRules.size());
        log.info("Wrote {} with {} rules", rulesJson, rules.size());
    }

    private static List<Map<String, Object>> ruleMaps(List<RuleRecord> rules) {
        return ruleMaps(rules, 1);
    }

    private static List<Map<String, Object>> ruleMaps(List<RuleRecord> rules, int firstId) {
        List<Map<String, Object>> rows = new ArrayList<>();
        int id = firstId;
        for (RuleRecord rule : rules) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ruleId", id++);
            row.put("lhs", rule.lhs());
            row.put("rhs", rule.rhs());
            row.put("support", rule.support());
            row.put("confidence", rule.confidence());
            row.put("lift", rule.lift());
            row.put("category", rule.category());
            row.put("pass", rule.pass());
            row.put("jointCount", rule.jointCount());
            row.put("lhsCount", rule.lhsCount());
            var named = RuleNaming.describe(rule.lhs(), rule.rhs());
            row.put("familyId", named.familyId());
            row.put("familyLabel", named.familyLabel());
            row.put("shortName", named.shortName());
            row.put("conditions", named.conditions());
            rows.add(row);
        }
        return rows;
    }

    private static double maxLift(List<RuleRecord> rules) {
        return rules.stream().mapToDouble(RuleRecord::lift).max().orElse(0.0);
    }

    private static void printSummary(
            List<RuleRecord> defaultRules,
            List<RuleRecord> nonDefaultRules,
            TargetRuleSearch search) {
        System.out.println();
        System.out.println("=== PHASE 7 SUMMARY ===");
        System.out.printf("Rules: %d total (default=%d, non-default=%d)%n",
                defaultRules.size() + nonDefaultRules.size(),
                defaultRules.size(), nonDefaultRules.size());
        System.out.printf("Default support attempts: %s; final=%.4f; minLift=%.2f%n",
                search.attemptedSupports(), search.finalSupport(), AssociationService.DEFAULT_MIN_LIFT);
    }
}
