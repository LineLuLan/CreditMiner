package com.creditminer.controller;

import com.creditminer.dto.response.RuleResponse;
import com.creditminer.entity.Rule;
import com.creditminer.repository.RuleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/**
 * {@code GET /api/rules} — Apriori rules.
 *
 * <p>See {@code docs/BE_Handoff.md §3.9}.</p>
 */
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
@Tag(name = "Rules", description = "Association rules")
public class RuleController {

    private final RuleRepository repo;

    @GetMapping
    @Operation(summary = "Association rules sorted by lift desc")
    public List<RuleResponse> list(@RequestParam(value = "minLift", defaultValue = "1.2") double minLift,
                                   @RequestParam(value = "category", required = false) String category) {
        BigDecimal threshold = BigDecimal.valueOf(minLift);
        List<Rule> rules = (category == null || category.isBlank())
                ? repo.findByMinLift(threshold)
                : repo.findByMinLiftAndCategory(threshold, category);
        return rules.stream().map(this::toDto).toList();
    }

    private RuleResponse toDto(Rule r) {
        return RuleResponse.builder()
                .ruleId(r.getRuleId())
                .lhs(r.getLhs())
                .rhs(r.getRhs())
                .support(r.getSupport().doubleValue())
                .confidence(r.getConfidence().doubleValue())
                .lift(r.getLift().doubleValue())
                .category(r.getCategory())
                .build();
    }
}
