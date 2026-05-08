package com.creditminer.controller;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.dto.response.CustomerSummaryResponse;
import com.creditminer.dto.response.PageResponse;
import com.creditminer.entity.Cluster;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * {@code /api/clusters} endpoints — see {@code docs/BE_Handoff.md §3.7-§3.8}.
 */
@Slf4j
@RestController
@RequestMapping("/api/clusters")
@RequiredArgsConstructor
@Tag(name = "Clusters", description = "Customer segments")
public class ClusterController {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Double>> CENTROID_TYPE =
            new TypeReference<>() {};

    private final ClusterRepository clusterRepo;
    private final CustomerRepository customerRepo;

    @GetMapping
    @Operation(summary = "Cluster summaries")
    public List<ClusterResponse> all() {
        return clusterRepo.findAll().stream().map(this::toResponse).toList();
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
                        .riskScore(c.getRiskScore() == null ? null : c.getRiskScore().doubleValue())
                        .clusterId(c.getClusterId())
                        .isOutlier(c.getIsOutlier())
                        .isAnomaly(c.getIsAnomaly())
                        .build());
    }

    private ClusterResponse toResponse(Cluster c) {
        Map<String, Double> centroid;
        try {
            centroid = c.getCentroidJson() == null
                    ? Map.of()
                    : MAPPER.readValue(c.getCentroidJson(), CENTROID_TYPE);
        } catch (Exception e) {
            log.warn("Failed to parse centroid_json for cluster {}: {}", c.getClusterId(), e.getMessage());
            centroid = Map.of();
        }
        return ClusterResponse.builder()
                .clusterId(c.getClusterId())
                .personaName(c.getPersonaName())
                .size(c.getSize() == null ? 0 : c.getSize())
                .centroid(centroid)
                .avgRisk(c.getAvgRisk() == null ? 0.0 : c.getAvgRisk().doubleValue())
                .churnRate(c.getChurnRate() == null ? 0.0 : c.getChurnRate().doubleValue())
                .description(c.getDescription())
                .build();
    }
}
