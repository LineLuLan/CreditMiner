package com.creditminer.controller;

import com.creditminer.dto.response.CorrelationResponse;
import com.creditminer.dto.response.DefaultGroupResponse;
import com.creditminer.dto.response.DescribeResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.dto.response.PcaPointResponse;
import com.creditminer.dto.response.PcaMetaResponse;
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

@RestController
@RequestMapping("/api/eda")
@RequiredArgsConstructor
@Tag(name = "EDA", description = "Exploratory data analysis")
public class EdaController {
    private final DescribeCacheService describeCacheService;
    private final EdaService edaService;

    @GetMapping("/describe")
    @Operation(summary = "Column summary statistics")
    public DescribeResponse describe() {
        return describeCacheService.get();
    }

    @GetMapping("/distribution")
    @Operation(summary = "Histogram or value counts, optionally split by Default")
    public DistributionResponse distribution(
            @RequestParam("col") String column,
            @RequestParam(value = "bins", required = false) Integer bins,
            @RequestParam(value = "split", required = false) String split,
            @RequestParam(value = "binning", required = false) String binning) {
        return edaService.distribution(column, bins, split, binning);
    }

    @GetMapping("/correlation")
    @Operation(summary = "Pearson correlation matrix for numeric features")
    public CorrelationResponse correlation() {
        return edaService.correlation();
    }

    @GetMapping("/default-by")
    @Operation(summary = "Default rate grouped by an accepted dimension")
    public List<DefaultGroupResponse> defaultBy(@RequestParam("dim") String dimension) {
        return edaService.defaultBy(dimension);
    }

    @GetMapping("/pca-2d")
    @Operation(summary = "First two principal components from Phase 6")
    public List<PcaPointResponse> pca2d() {
        return edaService.pca2d();
    }

    @GetMapping("/pca-2d/meta")
    @Operation(summary = "Exported PCA variance shares and percentile zoom bounds")
    public PcaMetaResponse pcaMeta() {
        return edaService.pcaMeta();
    }
}
