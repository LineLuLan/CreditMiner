package com.creditminer.controller;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.dto.response.CustomerSummaryResponse;
import com.creditminer.dto.response.PageResponse;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * {@code /api/clusters} endpoints — see {@code docs/BE_Handoff.md §3.7-§3.8}.
 */
@RestController
@RequestMapping("/api/clusters")
@RequiredArgsConstructor
@Tag(name = "Clusters", description = "Customer segments")
public class ClusterController {

    private final ClusterRepository clusterRepo;
    private final CustomerRepository customerRepo;

    @GetMapping
    @Operation(summary = "Cluster summaries")
    public List<ClusterResponse> all() {
        // TODO: real mapping including centroid_json parse
        return List.of(
                ClusterResponse.builder()
                        .clusterId(0).personaName("Premium Loyal").size(3210)
                        .centroid(Map.of("Credit_Limit", 18420.0, "Avg_Utilization_Ratio", 0.15))
                        .avgRisk(0.21).churnRate(0.06)
                        .description("High credit, low utilization, high transactions")
                        .build()
        );
    }

    @GetMapping("/{id}/customers")
    @Operation(summary = "Paginated customers belonging to a cluster")
    public PageResponse<CustomerSummaryResponse> customers(@PathVariable("id") Integer id,
                                                           @RequestParam(value = "page", defaultValue = "1") int page,
                                                           @RequestParam(value = "size", defaultValue = "20") int size) {
        var pageable = PageRequest.of(Math.max(0, page - 1), Math.min(100, size));
        return PageResponse.from(customerRepo.findByClusterId(id, pageable),
                c -> CustomerSummaryResponse.builder()
                        .clientNum(c.getClientNum())
                        .attritionFlag(c.getAttritionFlag())
                        .customerAge(c.getCustomerAge())
                        .gender(c.getGender())
                        .cardCategory(c.getCardCategory())
                        .customerTier(c.getCustomerTier())
                        .clusterId(c.getClusterId())
                        .isOutlier(c.getIsOutlier())
                        .isAnomaly(c.getIsAnomaly())
                        .build());
    }
}
