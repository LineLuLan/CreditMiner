package com.creditminer.controller;

import com.creditminer.dto.response.OverviewResponse;
import com.creditminer.repository.CustomerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/overview")
@RequiredArgsConstructor
@Tag(name = "Overview", description = "Portfolio summary")
public class OverviewController {
    private final CustomerRepository customerRepository;

    @GetMapping
    @Operation(summary = "Get portfolio overview")
    public OverviewResponse overview() {
        long total = customerRepository.count();
        long defaultCount = customerRepository.countByDefaultFlag("Yes");
        return OverviewResponse.builder()
                .totalCustomers(total)
                .defaultCount(defaultCount)
                .defaultRate(total == 0 ? 0 : (double) defaultCount / total)
                .avgPayRatio(orZero(customerRepository.avgPayRatio()))
                .avgUtilization(orZero(customerRepository.avgUtilization()))
                .riskTierBreakdown(riskTierBreakdown())
                .build();
    }

    private Map<String, Long> riskTierBreakdown() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (Object[] row : customerRepository.riskTierBreakdown()) {
            if (row[0] != null) result.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return result;
    }

    private static double orZero(Double value) {
        return value == null ? 0 : value;
    }
}
