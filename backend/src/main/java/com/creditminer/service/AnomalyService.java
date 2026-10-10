package com.creditminer.service;

import com.creditminer.dto.response.AnomalyResponse;
import com.creditminer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

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

    /** Top-N anomalous customers by Phase 6 centroid distance. */
    public List<AnomalyResponse> topAnomalies(int limit) {
        return customerRepository.findTopAnomalies(limit).stream()
                .sorted(Comparator.comparing(
                                com.creditminer.entity.Customer::getCentroidDistance,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(com.creditminer.entity.Customer::getClientId))
                .map(c -> AnomalyResponse.builder()
                        .clientId(c.getClientId())
                        .reason(deriveReason(c))
                        .score(scaleDistance(c.getCentroidDistance()))
                        .clusterId(c.getClusterId())
                        .build())
                .toList();
    }

    private String deriveReason(com.creditminer.entity.Customer c) {
        String distanceSignal = c.getCentroidDistance() == null
                ? "cluster distance unavailable"
                : String.format(Locale.ROOT, "cluster distance %.4f > strong threshold", c.getCentroidDistance());
        return Boolean.TRUE.equals(c.getIsOutlier())
                ? distanceSignal + "; IQR/Z outlier"
                : distanceSignal;
    }

    private static BigDecimal scaleDistance(BigDecimal distance) {
        return distance == null ? null : distance.setScale(4, RoundingMode.HALF_UP);
    }
}
