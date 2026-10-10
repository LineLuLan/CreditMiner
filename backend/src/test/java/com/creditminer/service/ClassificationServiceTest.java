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

    @org.junit.jupiter.api.io.TempDir
    java.nio.file.Path tempDir;

    @Test
    void predictionLabelsPermutationImportanceAndUsesImportanceRatherThanImpurity() throws Exception {
        var importance = tempDir.resolve("importance.json");
        java.nio.file.Files.writeString(importance, """
                {"metric":"PermutationImportance","ranking":[
                  {"name":"AGE","importance":0.1,"impuritySplitCount":99999},
                  {"name":"PAY_1","importance":0.6,"impuritySplitCount":2},
                  {"name":"MONTHS_DELAYED","importance":0.3,"impuritySplitCount":1}]}
                """);
        var cfg = Mockito.mock(ModelConfig.class);
        var classifier = Mockito.mock(weka.classifiers.Classifier.class);
        Mockito.when(cfg.getClassifier()).thenReturn(classifier);
        Mockito.when(cfg.getClassifierPath()).thenReturn("models/RANDOMFOREST_COST.model");
        var builder = Mockito.mock(PredictInputBuilder.class);
        Mockito.when(builder.isReady()).thenReturn(true);
        var instance = Mockito.mock(weka.core.Instance.class);
        var outcome = new weka.core.Attribute("Default", java.util.List.of("No", "Yes"));
        Mockito.when(instance.classAttribute()).thenReturn(outcome);
        Mockito.when(builder.build(Mockito.any())).thenReturn(instance);
        Mockito.when(classifier.distributionForInstance(instance)).thenReturn(new double[] {0.8, 0.2});
        Mockito.when(builder.engineer(Mockito.any())).thenReturn(
                new PredictInputBuilder.EngineeredFeatures(0, 0, 0, 0, 0, 0, "Low"));
        var service = new ClassificationService(cfg, Mockito.mock(ClusteringService.class), builder,
                Mockito.mock(ClusterRepository.class), Mockito.mock(PredictionLogRepository.class));
        org.springframework.test.util.ReflectionTestUtils.setField(service, "featureImportancePath", importance.toString());

        var response = service.predict(sampleRequest());
        var json = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(response);
        org.assertj.core.api.Assertions.assertThat(json.path("importanceMethod").asText())
                .isEqualTo("permutation importance, holdout AUC drop");
        org.assertj.core.api.Assertions.assertThat(response.getTopFeatures())
                .extracting(com.creditminer.dto.response.PredictResponse.FeatureContribution::getName)
                .containsExactly("PAY_1", "MONTHS_DELAYED", "AGE");
        org.assertj.core.api.Assertions.assertThat(response.getTopFeatures().get(0).getContribution()).isEqualTo(0.6);

        java.nio.file.Files.writeString(importance, "{}");
        org.assertj.core.api.Assertions.assertThat(service.predict(sampleRequest()).getTopFeatures())
                .isEqualTo(response.getTopFeatures());
    }

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
        r.setLimitBal(BigDecimal.valueOf(12500));
        r.setSex("Female");
        r.setEducation("Graduate");
        r.setMarriage("Married");
        r.setAge(45);
        r.setPay1(0); r.setPay2(0); r.setPay3(0);
        r.setPay4(0); r.setPay5(0); r.setPay6(0);
        r.setBillAmt1(BigDecimal.valueOf(800)); r.setBillAmt2(BigDecimal.valueOf(700));
        r.setBillAmt3(BigDecimal.valueOf(600)); r.setBillAmt4(BigDecimal.valueOf(500));
        r.setBillAmt5(BigDecimal.valueOf(400)); r.setBillAmt6(BigDecimal.valueOf(300));
        r.setPayAmt1(BigDecimal.valueOf(100)); r.setPayAmt2(BigDecimal.valueOf(100));
        r.setPayAmt3(BigDecimal.valueOf(100)); r.setPayAmt4(BigDecimal.valueOf(100));
        r.setPayAmt5(BigDecimal.valueOf(100)); r.setPayAmt6(BigDecimal.valueOf(100));
        return r;
    }
}
