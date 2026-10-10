package com.creditminer.service;

import com.creditminer.dto.response.AnomalyResponse;
import com.creditminer.entity.Customer;
import com.creditminer.repository.CustomerRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnomalyServiceTest {

    @Test
    void ranksByCentroidDistanceAndUsesDistanceAsScore() {
        CustomerRepository repository = mock(CustomerRepository.class);
        Customer lower = anomaly(10L, "0.6100");
        Customer higher = anomaly(20L, "0.7421");
        when(repository.findTopAnomalies(2)).thenReturn(List.of(lower, higher));

        List<AnomalyResponse> result = new AnomalyService(repository).topAnomalies(2);

        assertEquals(List.of(20L, 10L), result.stream().map(AnomalyResponse::getClientId).toList());
        assertEquals(new BigDecimal("0.7421"), result.get(0).getScore());
        assertEquals(new BigDecimal("0.6100"), result.get(1).getScore());
        assertTrue(result.get(0).getReason().contains("strong threshold"));
        assertTrue(result.get(0).getReason().contains("IQR/Z outlier"));
        verify(repository).findTopAnomalies(2);
    }

    private static Customer anomaly(long clientId, String distance) {
        return Customer.builder()
                .clientId(clientId)
                .clusterId(1)
                .centroidDistance(new BigDecimal(distance))
                .isOutlier(true)
                .isAnomaly(true)
                .build();
    }
}
