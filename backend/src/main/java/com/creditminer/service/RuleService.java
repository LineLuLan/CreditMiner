package com.creditminer.service;

import com.creditminer.dto.response.RuleResponse;
import com.creditminer.dto.response.RuleFamilyResponse;
import com.creditminer.entity.Rule;
import com.creditminer.exception.BusinessException;
import com.creditminer.repository.RuleRepository;
import com.creditminer.repository.CustomerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RuleService {
    private final RuleRepository repository;
    private final ObjectMapper mapper;
    private final CustomerRepository customers;
    @Value("${creditminer.models.rules-json:models/rules.json}")
    private String rulesPath;

    /* Intent: compare each modifier to its actual singleton in the same artifact cohort.
       Status: read-only view; absent singletons have combined-only families and null uplift.
       Next: consume families in the dashboard. Blockers: none; confidence: artifact-backed tests. */
    public RuleFamilyResponse families(String category) {
        String artifactCategory = switch (category) {
            case "default" -> "default";
            case "nonDefault" -> "non-default";
            default -> throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                    "Category must be default or nonDefault");
        };
        File file = new File(rulesPath);
        if (!file.isFile()) throw new BusinessException("NOT_FOUND", HttpStatus.NOT_FOUND,
                "Rule artifact not found at " + rulesPath);
        JsonNode artifact;
        Baseline baseline;
        try {
            artifact = mapper.readTree(file);
            baseline = baseline(artifact);
        } catch (IOException | IllegalArgumentException | IllegalStateException e) {
            throw new BusinessException("MODEL_NOT_LOADED", HttpStatus.SERVICE_UNAVAILABLE,
                    "Rule artifact cannot be read with a valid baseline");
        }
        Map<String, RuleResponse> rules = new LinkedHashMap<>();
        for (String section : List.of("rules", "familyMembers")) {
            for (JsonNode node : artifact.path(section)) {
                if (artifactCategory.equals(node.path("category").asText())) {
                    RuleResponse rule = artifactResponse(node, baseline);
                    rules.putIfAbsent(rule.getLhs(), rule);
                }
            }
        }
        Map<String, RuleResponse> bases = new LinkedHashMap<>();
        rules.values().stream().filter(rule -> rule.getConditions().size() == 1)
                .forEach(rule -> bases.putIfAbsent(rule.getFamilyId(), rule));
        List<RuleFamilyResponse.Family> families = new ArrayList<>();
        for (RuleResponse base : bases.values()) {
            RuleNaming.Condition condition = base.getConditions().get(0);
            List<RuleFamilyResponse.Modifier> modifiers = rules.values().stream()
                    .filter(rule -> rule.getConditions().size() > 1 && rule.getFamilyId().equals(base.getFamilyId()))
                    .map(rule -> modifier(rule, base)).sorted(Comparator.comparingDouble(
                            RuleFamilyResponse.Modifier::getConfidence).reversed()
                            .thenComparingLong(RuleFamilyResponse.Modifier::getRuleId)).toList();
            families.add(RuleFamilyResponse.Family.builder().familyId(base.getFamilyId()).label(base.getFamilyLabel())
                    .attribute(condition.attribute()).attributeLabel(condition.label()).baseRule(base)
                    .memberCount(modifiers.size() + 1).modifiers(modifiers).build());
        }
        families.sort(Comparator.comparingDouble((RuleFamilyResponse.Family family) ->
                artifactCategory.equals("default") ? family.getBaseRule().getLift() : family.getBaseRule().getSupport())
                .reversed().thenComparing(RuleFamilyResponse.Family::getFamilyId));
        List<RuleResponse> ungroupedRules = rules.values().stream()
                .filter(rule -> !bases.containsKey(rule.getFamilyId())).toList();
        Map<String, List<RuleResponse>> combinedFamilies = ungroupedRules.stream().collect(Collectors.groupingBy(
                RuleResponse::getFamilyId, LinkedHashMap::new, Collectors.toList()));
        for (var entry : combinedFamilies.entrySet()) {
            RuleResponse representative = entry.getValue().get(0);
            RuleNaming.Condition condition = representative.getConditions().get(0);
            List<RuleFamilyResponse.Modifier> modifiers = entry.getValue().stream()
                    .map(rule -> modifier(rule, null)).sorted(Comparator.comparingDouble(
                            RuleFamilyResponse.Modifier::getConfidence).reversed()
                            .thenComparingLong(RuleFamilyResponse.Modifier::getRuleId)).toList();
            families.add(RuleFamilyResponse.Family.builder().familyId(entry.getKey())
                    .label(representative.getFamilyLabel() + " (combined conditions only)")
                    .attribute(condition.attribute()).attributeLabel(condition.label()).baseRule(null)
                    .memberCount(modifiers.size()).modifiers(modifiers).build());
        }
        Map<String, List<RuleFamilyResponse.Family>> grouped = families.stream().collect(Collectors.groupingBy(
                RuleFamilyResponse.Family::getAttribute, LinkedHashMap::new, Collectors.toList()));
        List<RuleFamilyResponse.Group> groups = grouped.entrySet().stream().map(entry ->
                RuleFamilyResponse.Group.builder().attribute(entry.getKey())
                        .attributeLabel(entry.getValue().get(0).getAttributeLabel())
                        .familyIds(entry.getValue().stream().map(RuleFamilyResponse.Family::getFamilyId).toList())
                        .build()).toList();
        return RuleFamilyResponse.builder().baseline(baseline).families(families).groups(groups)
                .ungroupedRules(ungroupedRules)
                .build();
    }

    private RuleFamilyResponse.Modifier modifier(RuleResponse rule, RuleResponse base) {
        String text = rule.getConditions().stream().skip(1).map(RuleNaming.Condition::text)
                .collect(Collectors.joining("; "));
        return RuleFamilyResponse.Modifier.builder().ruleId(rule.getRuleId()).label(text).conditionText(text)
                .confidence(rule.getConfidence()).lift(rule.getLift()).support(rule.getSupport())
                .jointCount(rule.getJointCount()).lhsCount(rule.getLhsCount())
                .upliftPp(base == null ? null : Math.round((rule.getConfidence() - base.getConfidence()) * 1000) / 10.0)
                .build();
    }

    private RuleResponse artifactResponse(JsonNode node, Baseline baseline) {
        return RuleNaming.enrich(RuleResponse.builder()
                .ruleId(node.path("ruleId").asLong()).lhs(node.path("lhs").asText()).rhs(node.path("rhs").asText())
                .support(node.path("support").asDouble()).confidence(node.path("confidence").asDouble())
                .lift(node.path("lift").asDouble()).category(node.path("category").asText())
                .lhsCount(node.path("lhsCount").isNumber() ? node.path("lhsCount").asLong() : null)
                .jointCount(node.path("jointCount").isNumber() ? node.path("jointCount").asLong() : null)
                .build(), baseline.totalRows(), baseline.defaultRate());
    }

    public List<RuleResponse> list(double minLift, String category) {
        List<Rule> rows = category == null || category.isBlank()
                ? repository.findByMinLift(BigDecimal.valueOf(minLift))
                : repository.findByMinLiftAndCategory(BigDecimal.valueOf(minLift), category);
        if (rows.isEmpty()) return List.of();
        Baseline baseline = loadBaseline(mapper, rulesPath, customers);
        Map<String, List<RuleResponse>> families = loadFamilyMembers(baseline, minLift);
        return rows.stream().map(row -> {
            RuleResponse response = response(row, baseline);
            RuleResponse exact = families.getOrDefault(response.getCategory() + ":" + response.getFamilyId(), List.of())
                    .stream().filter(member -> member.getLhs().equals(response.getLhs())
                            && member.getRhs().equals(response.getRhs())).findFirst().orElse(null);
            if (exact != null) {
                response.setLhsCount(exact.getLhsCount());
                response.setJointCount(exact.getJointCount());
            }
            response.setFamilyMembers(families.getOrDefault(response.getCategory() + ":" + response.getFamilyId(), List.of())
                    .stream().filter(member -> !member.getLhs().equals(response.getLhs())).toList());
            return response;
        }).toList();
    }

    /* Intent: expose variants without changing representative counts or persisting extra DB rows.
       Status: artifact-backed additive field. Next: consume familyMembers in the rules view.
       Blockers: none. Confidence: controller regression covers family and outcome isolation. */
    private Map<String, List<RuleResponse>> loadFamilyMembers(Baseline baseline, double minLift) {
        Map<String, List<RuleResponse>> families = new LinkedHashMap<>();
        try {
            JsonNode artifact = mapper.readTree(new File(rulesPath));
            if (artifact == null || !artifact.isObject()) return families;
            for (String section : List.of("rules", "familyMembers")) {
            for (JsonNode member : artifact.path(section)) {
                if (member.path("lift").asDouble() < minLift) continue;
                RuleResponse response = artifactResponse(member, baseline);
                families.computeIfAbsent(response.getCategory() + ":" + response.getFamilyId(), key -> new ArrayList<>())
                        .add(response);
            }
            }
        } catch (IOException | IllegalArgumentException e) {
            // Legacy or unavailable artifacts retain the existing representative-only response.
        }
        return families;
    }

    /** Artifact cohort first; database cohort fallback keeps persisted rules available. */
    public static Baseline loadBaseline(ObjectMapper mapper, String path, CustomerRepository customers) {
        try {
            return baseline(mapper.readTree(new File(path)));
        } catch (IOException | IllegalArgumentException | IllegalStateException e) {
            if (customers != null) {
                try {
                    long total = customers.count();
                    long defaults = customers.countByDefaultFlag("Yes");
                    if (total > 0 && defaults >= 0 && defaults <= total)
                        return new Baseline(total, (double) defaults / total);
                } catch (RuntimeException unavailable) {
                    // Enrichment must not turn readable persisted rules into an unavailable endpoint.
                }
            }
            return new Baseline(null, null);
        }
    }

    public static RuleResponse response(Rule row, Baseline baseline) {
        return RuleNaming.enrich(RuleResponse.builder().ruleId(row.getRuleId() == null ? 0 : row.getRuleId())
                .lhs(row.getLhs()).rhs(row.getRhs()).support(row.getSupport().doubleValue())
                .confidence(row.getConfidence().doubleValue()).lift(row.getLift().doubleValue())
                .category(row.getCategory()).build(), baseline.totalRows(), baseline.defaultRate());
    }

    public record Baseline(Long totalRows, Double defaultRate) { }

    public static Baseline baseline(JsonNode root) {
        if (root == null) throw new IllegalStateException("Missing rule artifact");
        long total = root.path("baseline").path("totalRows").asLong(root.path("totalRows").asLong());
        if (total <= 0) throw new IllegalStateException("Rule artifact has no row count");
        if (root.path("baseline").path("defaultRate").isNumber()) {
            double rate = root.path("baseline").path("defaultRate").asDouble();
            if (Double.isFinite(rate) && rate >= 0 && rate <= 1) return new Baseline(total, rate);
            throw new IllegalStateException("Invalid default rate");
        }
        // Legacy artifacts stored lift = confidence / class rate; no migration is needed.
        for (JsonNode rule : root.path("rules")) {
            if (rule.path("lift").asDouble() > 0) {
                double rate = rule.path("confidence").asDouble() / rule.path("lift").asDouble();
                if (Double.isFinite(rate) && rate >= 0 && rate <= 1)
                    return new Baseline(total, "default".equals(rule.path("category").asText()) ? rate : 1 - rate);
            }
        }
        throw new IllegalStateException("Rule artifact has no class baseline");
    }
}
