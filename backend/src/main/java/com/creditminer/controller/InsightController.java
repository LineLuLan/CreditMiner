package com.creditminer.controller;

import com.creditminer.dto.response.AnomalyResponse;
import com.creditminer.dto.response.InsightResponse;
import com.creditminer.service.AnomalyService;
import com.creditminer.service.InsightService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Insights + Anomalies endpoints — see {@code docs/BE_Handoff.md §3.11-§3.12}.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Insights", description = "Business insights and anomalies")
public class InsightController {

    private final InsightService insightService;
    private final AnomalyService anomalyService;

    @GetMapping("/api/insights")
    @Operation(summary = "Hand-curated business insights (Discovery / Evidence / Recommendation)")
    public List<InsightResponse> insights(@RequestParam(value = "category", required = false) String category) {
        return category == null ? insightService.findAll() : insightService.findByCategory(category);
    }

    @GetMapping("/api/anomalies")
    @Operation(summary = "Top anomalous customers")
    public List<AnomalyResponse> anomalies(@RequestParam(value = "limit", defaultValue = "50") int limit) {
        return anomalyService.topAnomalies(Math.min(500, Math.max(1, limit)));
    }
}
