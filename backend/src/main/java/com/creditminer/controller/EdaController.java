package com.creditminer.controller;

import com.creditminer.dto.response.ChurnGroupResponse;
import com.creditminer.dto.response.CorrelationResponse;
import com.creditminer.dto.response.DescribeResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.service.DescribeCacheService;
import com.creditminer.service.EdaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * EDA endpoints.
 *
 * <ul>
 *   <li>{@code GET /api/eda/describe} (Phase 1) — column stats</li>
 *   <li>{@code GET /api/eda/distribution?col=&bins=} (Phase 4)</li>
 *   <li>{@code GET /api/eda/correlation} (Phase 4)</li>
 *   <li>{@code GET /api/eda/churn-by?dim=} (Phase 4)</li>
 * </ul>
 *
 * <p>See {@code docs/BE_Handoff.md §3.2 - §3.4, §3.13}.</p>
 */
@RestController
@RequestMapping("/api/eda")
@RequiredArgsConstructor
@Tag(name = "EDA", description = "Exploratory data analysis endpoints")
public class EdaController {

    private final DescribeCacheService describeCacheService;
    private final EdaService edaService;

    @GetMapping("/describe")
    @Operation(summary = "Phase 1 describe table — count, missing, mean/std/min/max/median per column")
    public DescribeResponse describe() {
        return describeCacheService.get();
    }

    @GetMapping("/distribution")
    @Operation(summary = "Histogram (numeric) or value counts (nominal) for a single column")
    public DistributionResponse distribution(@RequestParam("col") String col,
                                             @RequestParam(value = "bins", required = false) Integer bins) {
        return edaService.distribution(col, bins);
    }

    @GetMapping("/correlation")
    @Operation(summary = "Pearson correlation matrix for numeric features")
    public CorrelationResponse correlation() {
        return edaService.correlation();
    }

    @GetMapping("/churn-by")
    @Operation(summary = "Churn rate grouped by a categorical dimension")
    public List<ChurnGroupResponse> churnBy(@RequestParam("dim") String dim) {
        return edaService.churnBy(dim);
    }
}
