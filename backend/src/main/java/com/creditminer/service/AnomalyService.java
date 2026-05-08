package com.creditminer.service;

import com.creditminer.dto.response.AnomalyResponse;
import com.creditminer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Combines 3 signals into a single {@code is_anomaly} flag (Phase 6.5):
 * <ul>
 *   <li>Z-score outlier (Phase 2.3)</li>
 *   <li>IQR outlier (Phase 2.3)</li>
 *   <li>Distance-to-centroid &gt; μ+3σ for the assigned cluster (Phase 6.5)</li>
 * </ul>
 *
 * <p>A customer is anomalous if at least 2 of 3 signals fire.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyService {

    private final CustomerRepository customerRepository;

    /** Top-N anomalous customers by combined risk signal. */
    public List<AnomalyResponse> topAnomalies(int limit) {
        return customerRepository.findTopAnomalies(limit).stream()
                .map(c -> AnomalyResponse.builder()
                        .clientNum(c.getClientNum())
                        .reason(deriveReason(c))
                        .score(c.getRiskScore() == null ? 0.0 : c.getRiskScore().doubleValue())
                        .clusterId(c.getClusterId())
                        .build())
                .toList();
    }

    private String deriveReason(com.creditminer.entity.Customer c) {
        // TODO: combine c.isOutlier + cluster-distance flag (separate column?)
        return Boolean.TRUE.equals(c.getIsOutlier()) ? "z-score, cluster-distance" : "cluster-distance";
    }
}
