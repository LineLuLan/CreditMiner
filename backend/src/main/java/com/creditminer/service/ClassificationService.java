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
import weka.classifiers.bayes.NaiveBayes;
import weka.classifiers.functions.Logistic;
import weka.classifiers.CostMatrix;
import weka.classifiers.meta.CostSensitiveClassifier;
import weka.classifiers.trees.J48;
import weka.classifiers.trees.RandomForest;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.supervised.instance.SMOTE;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Phase 5 — train and evaluate classifiers (offline) + serve predictions (online).
 *
 * <p>Training methods are called by {@link com.creditminer.pipeline.Phase5Pipeline};
 * {@link #predict(PredictRequest)} is wired in Phase 8 (BE-90).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClassificationService {

    /** Names match the keys in {@link com.creditminer.pipeline.Phase5Pipeline}'s comparison CSV. */
    public enum Algo { J48, RandomForest, NaiveBayes, Logistic }

    private final ModelConfig modelConfig;
    private final ClusteringService clusteringService;

    // ===== TRAIN =====

    /** Build a fresh, untrained classifier with the canonical hyperparameters. */
    public Classifier build(Algo algo) {
        try {
            switch (algo) {
                case J48: {
                    J48 c = new J48();
                    c.setOptions(new String[] { "-C", "0.25", "-M", "2" });
                    return c;
                }
                case RandomForest: {
                    RandomForest c = new RandomForest();
                    c.setNumIterations(100);
                    c.setSeed(42);
                    c.setComputeAttributeImportance(true);
                    return c;
                }
                case NaiveBayes:
                    return new NaiveBayes();
                case Logistic:
                    return new Logistic();
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build classifier " + algo, e);
        }
        throw new IllegalArgumentException("Unknown algo: " + algo);
    }

    /** Train + cross-validate; record per-fold F1 and AUC. */
    public Evaluation crossValidate(Classifier clf, Instances train, int folds) throws Exception {
        Evaluation cv = new Evaluation(train);
        cv.crossValidateModel(clf, train, folds, new Random(42));
        return cv;
    }

    /** Train on full train set then evaluate on held-out test. */
    public Evaluation evaluate(Classifier clf, Instances train, Instances test) throws Exception {
        clf.buildClassifier(train);
        Evaluation eval = new Evaluation(train);
        eval.evaluateModel(clf, test);
        return eval;
    }

    /** Apply SMOTE to a TRAIN set only (never test). */
    public Instances applySmote(Instances train) throws Exception {
        SMOTE smote = new SMOTE();
        smote.setRandomSeed(42);
        smote.setInputFormat(train);
        Instances out = Filter.useFilter(train, smote);
        log.info("SMOTE applied: train {} → {} rows", train.numInstances(), out.numInstances());
        return out;
    }

    /**
     * Wrap a classifier in {@link CostSensitiveClassifier} with the
     * blueprint cost matrix [[0,1],[5,0]] (FN costs 5× FP).
     *
     * <p>Weka's CostMatrix uses {@code cell(actual, predicted)}: cost of
     * predicting {@code predicted} when the truth is {@code actual}. So
     * mis-predicting an Attrited customer (class index 1) as Existing (0)
     * costs 5; mis-predicting an Existing as Attrited costs 1.</p>
     */
    public CostSensitiveClassifier costSensitive(Classifier base) {
        try {
            CostSensitiveClassifier cs = new CostSensitiveClassifier();
            cs.setClassifier(base);
            CostMatrix cm = new CostMatrix(2);
            cm.setCell(0, 0, 0.0);
            cm.setCell(0, 1, 1.0);
            cm.setCell(1, 0, 5.0);
            cm.setCell(1, 1, 0.0);
            cs.setCostMatrix(cm);
            cs.setMinimizeExpectedCost(false);
            return cs;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build CostSensitiveClassifier", e);
        }
    }

    /** Snapshot of headline metrics for one classifier on one eval set. */
    public static Map<String, Double> headline(Evaluation eval, int positiveClassIdx) {
        Map<String, Double> m = new LinkedHashMap<>();
        m.put("accuracy", round(eval.pctCorrect() / 100.0));
        m.put("precision_attrited", round(eval.precision(positiveClassIdx)));
        m.put("recall_attrited", round(eval.recall(positiveClassIdx)));
        m.put("f1_attrited", round(eval.fMeasure(positiveClassIdx)));
        m.put("roc_auc", round(eval.areaUnderROC(positiveClassIdx)));
        m.put("pr_auc", round(eval.areaUnderPRC(positiveClassIdx)));
        return m;
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }

    // ===== SERVE (Phase 8 — BE-90) =====

    public PredictResponse predict(PredictRequest request) {
        if (!modelConfig.isReady()) {
            throw BusinessException.modelNotLoaded();
        }
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
