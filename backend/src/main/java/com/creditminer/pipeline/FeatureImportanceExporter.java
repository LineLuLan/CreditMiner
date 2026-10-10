package com.creditminer.pipeline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import weka.classifiers.Classifier;
import weka.classifiers.evaluation.Evaluation;
import weka.classifiers.meta.CostSensitiveClassifier;
import weka.classifiers.meta.FilteredClassifier;
import weka.classifiers.trees.RandomForest;
import weka.core.Instances;
import weka.core.Instance;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Random;

/**
 * Intent: rank features by holdout permutation AUC loss, retaining Weka impurity as reference.
 * Status: shared by training and saved-model reports; next: consume the corrected ranking.
 * Blockers: importance must be enabled at training time; confidence: signal/noise and wrapper tests.
 */
public final class FeatureImportanceExporter {

    private static final int REPEATS = 5;
    private static final int SEED = 42;

    private FeatureImportanceExporter() {
    }

    static RandomForest unwrap(Classifier classifier) {
        while (true) {
            if (classifier instanceof FilteredClassifier filtered) {
                classifier = filtered.getClassifier();
            } else if (classifier instanceof CostSensitiveClassifier cost) {
                classifier = cost.getClassifier();
            } else if (classifier instanceof RandomForest forest) {
                return forest;
            } else {
                throw new IllegalArgumentException("Expected RandomForest, found " + classifier.getClass().getName());
            }
        }
    }

    public static Map<String, Object> document(Classifier classifier, Instances holdout, String variant)
            throws Exception {
        long start = System.nanoTime();
        int positive = holdout.classAttribute().indexOfValue("Yes");
        if (positive < 0) throw new IllegalArgumentException("Default=Yes class is required");
        RandomForest forest = unwrap(classifier);
        double[] splitCounts = new double[holdout.numAttributes()];
        double[] impurity = forest.computeAverageImpurityDecreasePerAttribute(splitCounts);
        Scores baseline = evaluate(classifier, holdout, positive);
        Random random = new Random(SEED);
        List<Map<String, Object>> ranking = new ArrayList<>();
        double positiveDropSum = 0;
        for (int index = 0; index < holdout.numAttributes(); index++) {
            if (index == holdout.classIndex()) continue;
            double[] original = holdout.attributeToDoubleArray(index);
            double[] aucDrops = new double[REPEATS];
            double f1Drop = 0;
            for (int repeat = 0; repeat < REPEATS; repeat++) {
                // Start from the untouched column each time; retain row labels and all other features.
                double[] shuffled = original.clone();
                for (int row = shuffled.length - 1; row > 0; row--) {
                    int other = random.nextInt(row + 1);
                    double value = shuffled[row];
                    shuffled[row] = shuffled[other];
                    shuffled[other] = value;
                }
                Instances permuted = new Instances(holdout);
                for (int row = 0; row < shuffled.length; row++) {
                    permuted.instance(row).setValue(index, shuffled[row]);
                }
                Scores scores = evaluate(classifier, permuted, positive);
                aucDrops[repeat] = baseline.rocAuc() - scores.rocAuc();
                f1Drop += baseline.f1Default() - scores.f1Default();
            }
            double aucDrop = java.util.Arrays.stream(aucDrops).average().orElseThrow();
            double variance = java.util.Arrays.stream(aucDrops)
                    .map(drop -> (drop - aucDrop) * (drop - aucDrop)).average().orElseThrow();
            positiveDropSum += Math.max(0, aucDrop);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", holdout.attribute(index).name());
            row.put("aucDrop", aucDrop);
            row.put("aucDropStd", Math.sqrt(variance));
            row.put("f1Drop", f1Drop / REPEATS);
            row.put("impurityAvgPerSplit", impurity[index]);
            row.put("impuritySplitCount", splitCounts[index]);
            ranking.add(row);
            System.out.printf(Locale.ROOT, "Permutation %s: AUC drop %.6f, F1 drop %.6f%n",
                    holdout.attribute(index).name(), aucDrop, f1Drop / REPEATS);
        }
        for (Map<String, Object> row : ranking) {
            double drop = ((Number) row.get("aucDrop")).doubleValue();
            row.put("importance", positiveDropSum > 0 ? Math.max(0, drop) / positiveDropSum : 0.0);
        }
        ranking.sort(Comparator.comparingDouble(
                (Map<String, Object> row) -> ((Number) row.get("aucDrop")).doubleValue()).reversed());
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("model", "RandomForest");
        document.put("variant", variant);
        document.put("metric", "PermutationImportance");
        document.put("method", String.format(Locale.ROOT,
                "mean ROC AUC drop over %d column shuffles on the %,d-row holdout, seed %d; impurity fields from Weka for reference",
                REPEATS, holdout.numInstances(), SEED));
        document.put("aucDropStdDefinition", "population standard deviation across the five AUC drops");
        document.put("baseline", Map.of("rocAuc", baseline.rocAuc(), "f1Default", baseline.f1Default()));
        document.put("ranking", ranking);
        document.put("generatedAt", Instant.now().toString());
        document.put("runtimeMs", Math.round((System.nanoTime() - start) / 1_000_000.0));
        return document;
    }

    private static Scores evaluate(Classifier classifier, Instances data, int positive) throws Exception {
        Evaluation evaluation = new Evaluation(data);
        for (Instance actual : data) {
            Instance input = (Instance) actual.copy();
            input.setClassMissing();
            evaluation.evaluateModelOnceAndRecordPrediction(classifier.distributionForInstance(input), actual);
        }
        double auc = evaluation.areaUnderROC(positive);
        double f1 = evaluation.fMeasure(positive);
        if (!Double.isFinite(auc) || !Double.isFinite(f1)) {
            throw new IllegalArgumentException("Holdout ROC AUC and Default=Yes F1 must be finite");
        }
        return new Scores(auc, f1);
    }

    private record Scores(double rocAuc, double f1Default) {
    }

    public static void write(Classifier classifier, Instances holdout, String variant, Path output)
            throws Exception {
        Map<String, Object> document = document(classifier, holdout, variant);
        if (output.getParent() != null) Files.createDirectories(output.getParent());
        new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT).writeValue(output.toFile(), document);
    }
}
