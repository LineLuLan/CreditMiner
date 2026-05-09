package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.request.PredictRequest;
import com.creditminer.dto.response.PredictResponse;
import com.creditminer.entity.Cluster;
import com.creditminer.exception.BusinessException;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.PredictionLogRepository;
import com.creditminer.entity.PredictionLog;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;
import weka.classifiers.bayes.NaiveBayes;
import weka.classifiers.functions.Logistic;
import weka.classifiers.meta.CostSensitiveClassifier;
import weka.classifiers.trees.J48;
import weka.classifiers.trees.RandomForest;
import weka.classifiers.CostMatrix;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.supervised.instance.SMOTE;

import java.io.File;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Phase 5/8 — train and serve classifiers.
 *
 * <p>Training methods used by {@link com.creditminer.pipeline.Phase5Pipeline}.
 * {@link #predict(PredictRequest)} is the {@code POST /api/predict} backend.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClassificationService {

    public enum Algo { J48, RandomForest, NaiveBayes, Logistic }

    private final ModelConfig modelConfig;
    private final ClusteringService clusteringService;
    private final PredictInputBuilder inputBuilder;
    private final ClusterRepository clusterRepo;
    private final PredictionLogRepository predictionLogRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${creditminer.models.feature-importance-json:data/processed/phase5_feature_importance.json}")
    private String featureImportancePath;

    private List<Map.Entry<String, Double>> cachedTopFeatures;

    // ===== TRAIN =====

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

    public Evaluation crossValidate(Classifier clf, Instances train, int folds) throws Exception {
        Evaluation cv = new Evaluation(train);
        cv.crossValidateModel(clf, train, folds, new Random(42));
        return cv;
    }

    public Evaluation evaluate(Classifier clf, Instances train, Instances test) throws Exception {
        clf.buildClassifier(train);
        Evaluation eval = new Evaluation(train);
        eval.evaluateModel(clf, test);
        return eval;
    }

    public Instances applySmote(Instances train) throws Exception {
        SMOTE smote = new SMOTE();
        smote.setRandomSeed(42);
        smote.setInputFormat(train);
        Instances out = Filter.useFilter(train, smote);
        log.info("SMOTE applied: train {} → {} rows", train.numInstances(), out.numInstances());
        return out;
    }

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

    // ===== SERVE (BE-90/91) =====

    public PredictResponse predict(PredictRequest request) {
        Classifier rf = modelConfig.getClassifier();
        if (rf == null || !inputBuilder.isReady()) {
            throw BusinessException.modelNotLoaded();
        }
        try {
            Instance inst = inputBuilder.build(request);
            double[] probs = rf.distributionForInstance(inst);
            int positiveIdx = inst.classAttribute().indexOfValue("Attrited Customer");
            double churnProb = positiveIdx >= 0 ? probs[positiveIdx] : 0;
            String label = churnProb >= 0.5 ? "Attrited" : "Existing";

            int clusterId = -1;
            String clusterName = "Unknown";
            try {
                if (modelConfig.getClusterer() != null) {
                    clusterId = clusteringService.assignFromEnriched(inst);
                    if (clusterId >= 0) {
                        Cluster cluster = clusterRepo.findById(clusterId).orElse(null);
                        clusterName = cluster == null ? ("Cluster " + clusterId) : cluster.getPersonaName();
                    }
                }
            } catch (Exception clusterEx) {
                log.warn("Cluster assignment failed: {}", clusterEx.getMessage());
            }

            double riskScore = inputBuilder.computeRiskScore(request);

            PredictResponse response = PredictResponse.builder()
                    .churnProb(roundDouble(churnProb))
                    .label(label)
                    .riskScore(roundDouble(riskScore))
                    .cluster(clusterId)
                    .clusterName(clusterName)
                    .topFeatures(buildTopFeatures())
                    .recommendation(buildRecommendation(churnProb, clusterName))
                    .modelUsed("RandomForest_v1")
                    .build();

            try {
                logPrediction(request, response);
            } catch (Exception logEx) {
                log.warn("Failed to log prediction: {}", logEx.getMessage());
            }
            return response;
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Predict failed", e);
            throw BusinessException.inferenceError("Prediction failed: " + e.getMessage());
        }
    }

    private void logPrediction(PredictRequest request, PredictResponse response) throws Exception {
        PredictionLog logRow = PredictionLog.builder()
                .ts(OffsetDateTime.now())
                .inputJson(objectMapper.writeValueAsString(request))
                .predictedLabel(response.getLabel())
                .churnProb(BigDecimal.valueOf(response.getChurnProb()).setScale(4, RoundingMode.HALF_UP))
                .clusterId(response.getCluster() < 0 ? null : response.getCluster())
                .modelUsed(response.getModelUsed())
                .build();
        predictionLogRepo.save(logRow);
    }

    private List<PredictResponse.FeatureContribution> buildTopFeatures() {
        if (cachedTopFeatures == null) {
            cachedTopFeatures = loadTopFeatures();
        }
        // Normalize importance values into contribution shares (sum to 1) over the top 3.
        List<Map.Entry<String, Double>> top = cachedTopFeatures.subList(0,
                Math.min(3, cachedTopFeatures.size()));
        double total = 0;
        for (Map.Entry<String, Double> e : top) total += e.getValue();
        List<PredictResponse.FeatureContribution> out = new ArrayList<>(top.size());
        for (Map.Entry<String, Double> e : top) {
            out.add(new PredictResponse.FeatureContribution(
                    e.getKey(),
                    total == 0 ? 0 : roundDouble(e.getValue() / total)));
        }
        return out;
    }

    private List<Map.Entry<String, Double>> loadTopFeatures() {
        try {
            File f = new File(featureImportancePath);
            if (!f.exists()) {
                log.warn("Feature importance JSON missing at {} — top features will be empty", featureImportancePath);
                return List.of();
            }
            var node = objectMapper.readTree(f).get("ranking");
            if (node == null || !node.isArray()) return List.of();
            List<Map.Entry<String, Double>> out = new ArrayList<>();
            for (var n : node) {
                out.add(Map.entry(n.get("name").asText(), n.get("importance").asDouble()));
            }
            return out;
        } catch (Exception e) {
            log.warn("Failed to load feature importance: {}", e.getMessage());
            return List.of();
        }
    }

    /** Rule-based recommendation derived from churn probability + cluster. */
    private static String buildRecommendation(double churnProb, String clusterName) {
        if (churnProb >= 0.7) {
            return "High churn risk — escalate to retention team within 48h. Consider credit-limit increase or fee waiver.";
        }
        if (churnProb >= 0.4) {
            return "Elevated churn risk — add to monitoring watchlist. Trigger an engagement campaign at next inactivity flag.";
        }
        if ("At-Risk Mid-Tier".equalsIgnoreCase(clusterName)) {
            return "Sits in the highest-churn cluster (At-Risk Mid-Tier, 26% historical churn). Proactively offer a transaction-driving incentive (cashback bump or statement credit) and re-evaluate in 30 days.";
        }
        if ("Premium Loyal".equalsIgnoreCase(clusterName)) {
            return "Stable Premium Loyal customer — eligible for premium upsell and travel-rewards offer.";
        }
        if ("Low-Income Stable".equalsIgnoreCase(clusterName)) {
            return "Stable low-income customer with healthy engagement — promote tier upgrade with first-year fee waiver.";
        }
        return "Stable customer — maintain current relationship; no action needed.";
    }

    private static double roundDouble(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }
}
