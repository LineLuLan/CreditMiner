package com.creditminer.controller;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.dto.response.CustomerSummaryResponse;
import com.creditminer.dto.response.PageResponse;
import com.creditminer.entity.Cluster;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.service.ClusterService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/clusters")
@RequiredArgsConstructor
@Tag(name = "Clusters", description = "Behaviour segments")
public class ClusterController {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Double>> CENTROID_TYPE = new TypeReference<>() {};

    private final ClusterRepository clusterRepo;
    private final CustomerRepository customerRepo;
    private final ClusterService clusterService;

    @GetMapping
    @Operation(summary = "Cluster summaries")
    public List<ClusterResponse> all() {
        return clusterService.enrich(clusterRepo.findAll().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}/customers")
    @Operation(summary = "Paginated clients belonging to a cluster")
    public PageResponse<CustomerSummaryResponse> customers(
            @PathVariable("id") Integer id,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        var pageable = PageRequest.of(Math.max(0, page - 1), Math.min(100, size));
        return PageResponse.from(customerRepo.findByClusterId(id, pageable), CustomerController::toSummary);
    }

    private ClusterResponse toResponse(Cluster cluster) {
        Map<String, Double> centroid;
        try {
            centroid = cluster.getCentroidJson() == null
                    ? Map.of() : MAPPER.readValue(cluster.getCentroidJson(), CENTROID_TYPE);
        } catch (Exception ex) {
            log.warn("Failed to parse centroid for cluster {}: {}", cluster.getClusterId(), ex.getMessage());
            centroid = Map.of();
        }
        return ClusterResponse.builder()
                .clusterId(cluster.getClusterId())
                .personaName(cluster.getPersonaName())
                .size(cluster.getSize() == null ? 0 : cluster.getSize())
                .centroid(centroid)
                .avgRisk(cluster.getAvgRisk() == null ? 0 : cluster.getAvgRisk().doubleValue())
                .defaultRate(cluster.getDefaultRate() == null ? 0 : cluster.getDefaultRate().doubleValue())
                .description(cluster.getDescription())
                .build();
    }
}
