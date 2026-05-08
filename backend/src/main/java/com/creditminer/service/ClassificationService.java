package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.request.PredictRequest;
import com.creditminer.dto.response.PredictResponse;
import com.creditminer.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;
import weka.core.Instance;
import weka.core.Instances;

import java.util.List;
import java.util.Map;

/**
 * Phase 5 — train and serve classifiers.
 *
 * <p>Train side (offline, called from {@link com.creditminer.pipeline.TrainPipeline}):
 * <ul>
 *   <li>{@link #trainAll(Instances)} — fit J48, RandomForest, NaiveBayes</li>
 *   <li>{@link #evaluate(Classifier, Instances, Instances)} — F1, AUC</li>
 *   <li>{@link #crossValidate(Classifier, Instances, int)} — 10-fold CV</li>
 * </ul>
 * </p>
 *
 * <p>Serve side (online, called from {@code PredictController}):
 * <ul>
 *   <li>{@link #predict(PredictRequest)} — full inference pipeline</li>
 * </ul>
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClassificationService {

    private final ModelConfig modelConfig;
    private final ClusteringService clusteringService;

    // ===== TRAIN =====

    /** Trains all 3 algorithms. Saves each via SerializationHelper. */
    public Map<String, Classifier> trainAll(Instances train) throws Exception {
        // TODO: build J48 (-C 0.25 -M 2), RandomForest (200 iter), NaiveBayes
        // Each one written to its own .model file path
        return Map.of();
    }

    /** Train + cross-validate; record per-fold F1 and AUC. */
    public Evaluation crossValidate(Classifier clf, Instances train, int folds) throws Exception {
        // TODO: weka.classifiers.Evaluation.crossValidateModel
        return null;
    }

    /** Final test-set evaluation. */
    public Evaluation evaluate(Classifier clf, Instances train, Instances test) throws Exception {
        // TODO
        return null;
    }

    // ===== SERVE =====

    /**
     * Single-customer prediction.
     *
     * <p>Pipeline:
     * <ol>
     *   <li>Convert DTO → {@link Instance} via {@code DtoMapper}</li>
     *   <li>Run derived feature engineering on the single row</li>
     *   <li>Distance-to-centroids → cluster id and persona name</li>
     *   <li>{@code classifier.distributionForInstance()} → churnProb</li>
     *   <li>Lookup top-3 features (RF feature importance, pre-computed)</li>
     *   <li>Compose recommendation from probability + cluster + matching rules</li>
     * </ol>
     * </p>
     *
     * @throws BusinessException with code {@code MODEL_NOT_LOADED} if classifier not ready
     */
    public PredictResponse predict(PredictRequest request) {
        if (!modelConfig.isReady()) {
            throw BusinessException.modelNotLoaded();
        }
        // TODO: real inference flow; below is a representative stub.
        return PredictResponse.builder()
                .churnProb(0.124)
                .label("Existing")
                .riskScore(0.32)
                .cluster(1)
                .clusterName("Premium Loyal")
                .topFeatures(List.of(
                        new PredictResponse.FeatureContribution("Total_Trans_Ct", 0.28),
                        new PredictResponse.FeatureContribution("Avg_Utilization_Ratio", 0.19),
                        new PredictResponse.FeatureContribution("Months_Inactive_12_mon", 0.15)))
                .recommendation("Stable customer — eligible for premium upsell")
                .modelUsed("RandomForest_v1")
                .build();
    }
}
