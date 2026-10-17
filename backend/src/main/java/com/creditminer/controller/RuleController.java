package com.creditminer.controller;

import com.creditminer.dto.response.RuleResponse;
import com.creditminer.dto.response.RuleFamilyResponse;
import com.creditminer.service.RuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

/** GET /api/rules - persisted class-association rules with text-derived presentation. */
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
@Tag(name = "Rules", description = "Association rules")
public class RuleController {
    private final RuleService service;

    @GetMapping("/families")
    @Operation(summary = "Rule families with singleton bases and confidence uplift")
    public RuleFamilyResponse families(@RequestParam(value = "category", defaultValue = "default") String category) {
        return service.families(category);
    }

    @GetMapping
    @Operation(summary = "Association rules sorted by lift desc")
    public List<RuleResponse> list(@RequestParam(value = "minLift", defaultValue = "1.0") double minLift,
                                  @RequestParam(value = "category", required = false) String category) {
        return service.list(minLift, category);
    }
}
