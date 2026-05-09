package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.request.PredictRequest;
import com.creditminer.exception.BusinessException;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.PredictionLogRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Tests for {@link ClassificationService}. The serve path requires a real
 * Weka model + the {@link PredictInputBuilder} fed by enriched.arff, so unit
 * coverage focuses on the cold-start guard. End-to-end inference is exercised
 * by the manual smoke against the live BE.
 */
class ClassificationServiceTest {

    @Test
    void predictThrowsModelNotLoadedWhenClassifierMissing() {
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg.getClassifier()).thenReturn(null);
        ClusteringService clu = Mockito.mock(ClusteringService.class);
        PredictInputBuilder builder = Mockito.mock(PredictInputBuilder.class);
        Mockito.when(builder.isReady()).thenReturn(false);
        ClusterRepository clusterRepo = Mockito.mock(ClusterRepository.class);
        PredictionLogRepository logRepo = Mockito.mock(PredictionLogRepository.class);
        ClassificationService svc = new ClassificationService(
                cfg, clu, builder, clusterRepo, logRepo);

        assertThrows(BusinessException.class, () -> svc.predict(sampleRequest()));
    }

    @Test
    void predictThrowsModelNotLoadedWhenInputBuilderNotReady() {
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg.getClassifier()).thenReturn(Mockito.mock(weka.classifiers.Classifier.class));
        ClusteringService clu = Mockito.mock(ClusteringService.class);
        PredictInputBuilder builder = Mockito.mock(PredictInputBuilder.class);
        Mockito.when(builder.isReady()).thenReturn(false);
        ClusterRepository clusterRepo = Mockito.mock(ClusterRepository.class);
        PredictionLogRepository logRepo = Mockito.mock(PredictionLogRepository.class);
        ClassificationService svc = new ClassificationService(
                cfg, clu, builder, clusterRepo, logRepo);

        assertThrows(BusinessException.class, () -> svc.predict(sampleRequest()));
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
