package com.creditminer.service;

import com.creditminer.dto.response.RuleResponse;
import com.creditminer.entity.Rule;
import com.creditminer.repository.RuleRepository;
import com.creditminer.repository.CustomerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RuleService {
    private final RuleRepository repository;
    private final ObjectMapper mapper;
    private final CustomerRepository customers;
    @Value("${creditminer.models.rules-json:models/rules.json}")
    private String rulesPath;

    public List<RuleResponse> list(double minLift, String category) {
        List<Rule> rows = category == null || category.isBlank()
                ? repository.findByMinLift(BigDecimal.valueOf(minLift))
                : repository.findByMinLiftAndCategory(BigDecimal.valueOf(minLift), category);
        if (rows.isEmpty()) return List.of();
        Baseline baseline = loadBaseline(mapper, rulesPath, customers);
        Map<String, List<RuleResponse>> families = loadFamilyMembers(baseline, minLift);
        return rows.stream().map(row -> {
            RuleResponse response = response(row, baseline);
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
            for (JsonNode member : artifact.path("familyMembers")) {
                if (member.path("lift").asDouble() < minLift) continue;
                RuleResponse response = RuleNaming.enrich(RuleResponse.builder()
                        .ruleId(member.path("ruleId").asLong()).lhs(member.path("lhs").asText())
                        .rhs(member.path("rhs").asText()).support(member.path("support").asDouble())
                        .confidence(member.path("confidence").asDouble()).lift(member.path("lift").asDouble())
                        .category(member.path("category").asText())
                        .jointCount(member.path("jointCount").isNumber() ? member.path("jointCount").asLong() : null)
                        .build(), baseline.totalRows(), baseline.defaultRate());
                families.computeIfAbsent(response.getCategory() + ":" + response.getFamilyId(), key -> new ArrayList<>())
                        .add(response);
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
