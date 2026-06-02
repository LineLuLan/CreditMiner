package com.creditminer.controller;

import com.creditminer.dto.response.MiningReportResponse;
import com.creditminer.service.MiningReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consolidated report endpoint for the data-mining evidence page.
 */
@RestController
@RequestMapping("/api/mining-report")
@RequiredArgsConstructor
@Tag(name = "Mining Report", description = "CRISP-DM and data-mining evidence summary")
public class MiningReportController {

    private final MiningReportService miningReportService;

    @GetMapping
    @Operation(summary = "Get dataset, model, clustering, rules, anomaly, and insight evidence")
    public MiningReportResponse report() {
        return miningReportService.report();
    }
}
