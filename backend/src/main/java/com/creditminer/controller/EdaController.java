package com.creditminer.controller;

import com.creditminer.dto.response.DescribeResponse;
import com.creditminer.service.DescribeCacheService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/describe")
    @Operation(summary = "Phase 1 describe table — count, missing, mean/std/min/max/median per column")
    public DescribeResponse describe() {
        return describeCacheService.get();
    }

    @GetMapping("/distribution")
    @Operation(summary = "Histogram for a single numeric column")
    public Map<String, Object> distribution(@RequestParam("col") String col,
                                            @RequestParam(value = "bins", defaultValue = "20") int bins) {
        // TODO: query Postgres for numeric range, compute bin edges + counts
        return Map.of(
                "column", col,
                "binEdges", new double[]{1438, 5000, 10000, 15000, 20000, 25000, 34516},
                "counts", new int[]{3211, 2104, 1850, 1230, 980, 752}
        );
    }

    @GetMapping("/correlation")
    @Operation(summary = "Pearson correlation matrix for numeric features")
    public Map<String, Object> correlation() {
        // TODO: compute via SQL or read pre-computed JSON
        return Map.of(
                "columns", List.of("Customer_Age", "Credit_Limit", "Total_Trans_Amt"),
                "matrix", new double[][]{{1.0, 0.05, -0.02}, {0.05, 1.0, 0.31}, {-0.02, 0.31, 1.0}}
        );
    }

    @GetMapping("/churn-by")
    @Operation(summary = "Churn rate grouped by a categorical dimension")
    public List<Map<String, Object>> churnBy(@RequestParam("dim") String dim) {
        // TODO: GROUP BY {dim}, COUNT(*), SUM(CASE attrition_flag='Attrited' THEN 1 ELSE 0)
        return List.of(
                Map.of("group", "Less than $40K", "count", 3561, "attritedCount", 612, "churnRate", 0.1718),
                Map.of("group", "$40K - $60K",    "count", 1790, "attritedCount", 271, "churnRate", 0.1514)
        );
    }
}
