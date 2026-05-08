package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.request.PredictRequest;
import com.creditminer.dto.response.PredictResponse;
import com.creditminer.exception.BusinessException;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Stub tests for {@link ClassificationService}.
 *
 * <p>The first two tests cover the inference path with a stubbed model.</p>
 */
class ClassificationServiceTest {

    @Test
    void predictThrowsWhenModelNotLoaded() {
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg.isReady()).thenReturn(false);
        ClusteringService clu = Mockito.mock(ClusteringService.class);
        ClassificationService svc = new ClassificationService(cfg, clu);

        assertThrows(BusinessException.class, () -> svc.predict(sampleRequest()));
    }

    @Test
    void predictReturnsStubResponseWhenReady() {
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg.isReady()).thenReturn(true);
        ClusteringService clu = Mockito.mock(ClusteringService.class);
        ClassificationService svc = new ClassificationService(cfg, clu);

        PredictResponse r = svc.predict(sampleRequest());
        assertNotNull(r);
        assertNotNull(r.getLabel());
        assertTrue(r.getChurnProb() >= 0 && r.getChurnProb() <= 1);
    }

    @Test
    @Disabled("TODO: enable after BE-90 (real RandomForest inference)")
    void predictMatchesKnownLowRiskFixture() {
        // fixture: low-risk customer should yield churnProb < 0.3
    }

    @Test
    @Disabled("TODO: enable after BE-58 (test-set evaluation)")
    void evaluateProducesAtLeastF1Threshold() {
        // F1 on Attrited class >= 0.75
    }

    private PredictRequest sampleRequest() {
        PredictRequest r = new PredictRequest();
        r.setCustomerAge(45);
        r.setGender("M");
        r.setDependentCount(3);
        r.setEducationLevel("Graduate");
        r.setMaritalStatus("Married");
        r.setIncomeCategory("$60K - $80K");
        r.setCardCategory("Blue");
        r.setMonthsOnBook(36);
        r.setTotalRelationshipCount(5);
        r.setMonthsInactive12Mon(2);
        r.setContactsCount12Mon(3);
        r.setCreditLimit(BigDecimal.valueOf(12500));
        r.setTotalRevolvingBal(BigDecimal.valueOf(800));
        r.setTotalTransAmt(BigDecimal.valueOf(4500));
        r.setTotalTransCt(45);
        r.setAvgUtilizationRatio(BigDecimal.valueOf(0.064));
        return r;
    }
}
