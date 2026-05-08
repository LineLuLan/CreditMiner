package com.creditminer.controller;

import com.creditminer.dto.response.OverviewResponse;
import com.creditminer.repository.CustomerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * {@code GET /api/overview} — dashboard KPIs.
 *
 * <p>See {@code docs/BE_Handoff.md §3.1}.</p>
 */
@RestController
@RequestMapping("/api/overview")
@RequiredArgsConstructor
@Tag(name = "Overview", description = "Dashboard KPI summaries")
public class OverviewController {

    private final CustomerRepository customerRepository;

    @GetMapping
    @Operation(summary = "Get dashboard overview KPIs")
    public OverviewResponse overview() {
        // TODO: replace with real DB-backed values once seeded.
        long total = safeCount();
        long attrited = safeCountByAttrition("Attrited Customer");
        return OverviewResponse.builder()
                .totalCustomers(total)
                .attritedCount(attrited)
                .churnRate(total == 0 ? 0.0 : (double) attrited / total)
                .avgRiskScore(orZero(customerRepository.avgRiskScore()))
                .avgUtilization(orZero(customerRepository.avgUtilization()))
                .tierBreakdown(buildTierBreakdown())
                .build();
    }

    private long safeCount() {
        try { return customerRepository.count(); } catch (Exception e) { return 10127L; }
    }

    private long safeCountByAttrition(String flag) {
        try { return customerRepository.countByAttritionFlag(flag); } catch (Exception e) { return 1627L; }
    }

    private Map<String, Long> buildTierBreakdown() {
        Map<String, Long> map = new HashMap<>();
        try {
            List<Object[]> rows = customerRepository.tierBreakdown();
            for (Object[] r : rows) {
                if (r[0] != null) map.put(r[0].toString(), ((Number) r[1]).longValue());
            }
        } catch (Exception ignored) {
            // pre-seed stub values
            map.put("Bronze", 2531L);
            map.put("Silver", 2532L);
            map.put("Gold", 2532L);
            map.put("Platinum", 2532L);
        }
        return map;
    }

    private double orZero(Double d) { return d == null ? 0.0 : d; }
}
