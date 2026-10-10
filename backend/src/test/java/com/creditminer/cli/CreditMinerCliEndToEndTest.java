package com.creditminer.cli;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import weka.classifiers.AbstractClassifier;
import weka.core.Instance;
import weka.core.Instances;
import weka.core.SerializationHelper;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreditMinerCliEndToEndTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void trainsNamedDecisionTreeAndPredictsEverySampleRowWithTiming() throws Exception {
        Path sample = Path.of(getClass().getResource("/cli/train-sample-200.arff").toURI());
        Path models = temporaryDirectory.resolve("models");
        ByteArrayOutputStream trainOut = new ByteArrayOutputStream();

        int trainExit = CreditMinerCli.run(new String[]{
                        "train", "--train", sample.toString(), "--test", sample.toString(),
                        "--out", models.toString(), "--algo", "DECISIONTREE",
                        "--variant", "baseline", "--folds", "2", "--seed", "42"
                }, new PrintStream(trainOut), System.err, temporaryDirectory);

        assertEquals(0, trainExit, trainOut.toString());
        Path model = models.resolve("DECISIONTREE.model");
        assertTrue(Files.isRegularFile(model));
        JsonNode variant = new ObjectMapper().readTree(models.resolve("evaluation.json").toFile())
                .path("variants").get(0);
        assertTrue(variant.path("buildTimeMs").asLong() > 0);
        assertTrue(variant.path("cvTimeMs").asLong() > 0);
        assertTrue(variant.path("testPredictTimeMs").asLong() > 0);
        assertTrue(variant.path("predictMicrosPerRecord").asDouble() > 0);
        assertEquals(
                Math.round((variant.path("testPredictTimeMs").asDouble() * 1_000.0 / 200.0) * 100.0) / 100.0,
                variant.path("predictMicrosPerRecord").asDouble());

        Path predictions = temporaryDirectory.resolve("predictions.csv");
        ByteArrayOutputStream predictOut = new ByteArrayOutputStream();
        int predictExit = CreditMinerCli.run(new String[]{
                        "predict", "--model", model.toString(), "--test", sample.toString(),
                        "--out", predictions.toString()
                }, new PrintStream(predictOut), System.err, temporaryDirectory);

        assertEquals(0, predictExit, predictOut.toString());
        assertEquals(201, Files.readAllLines(predictions).size());
        assertTrue(predictOut.toString().contains("rows: 200"));
    }

    @Test
    void labeledPredictionUsesOneClassifierPassForCsvAndMetrics() throws Exception {
        Path sample = Path.of(getClass().getResource("/cli/train-sample-200.arff").toURI());
        Path model = temporaryDirectory.resolve("counting.model");
        SerializationHelper.write(model.toString(), new CountingClassifier());
        CountingClassifier.predictions = 0;

        int exit = CreditMinerCli.run(new String[]{
                        "predict", "--model", model.toString(), "--test", sample.toString(),
                        "--out", temporaryDirectory.resolve("counting.csv").toString()
                }, System.out, System.err, temporaryDirectory);

        assertEquals(0, exit);
        assertEquals(200, CountingClassifier.predictions);
    }

    @Test
    void costVariantWithDefaultAllTrainsOnlySupportedAlgorithms() throws Exception {
        Path sample = Path.of(getClass().getResource("/cli/train-sample-200.arff").toURI());
        Path models = temporaryDirectory.resolve("cost-models");
        ByteArrayOutputStream trainOut = new ByteArrayOutputStream();

        int exit = CreditMinerCli.run(new String[]{
                        "train", "--train", sample.toString(), "--out", models.toString(),
                        "--variant", "cost", "--folds", "2", "--seed", "42"
                }, new PrintStream(trainOut), System.err, temporaryDirectory);

        assertEquals(0, exit, trainOut.toString());
        assertTrue(Files.isRegularFile(models.resolve("DECISIONTREE_COST.model")));
        assertTrue(Files.isRegularFile(models.resolve("RANDOMFOREST_COST.model")));
        assertTrue(Files.notExists(models.resolve("NAIVEBAYES_COST.model")));
        assertTrue(Files.notExists(models.resolve("LOGISTIC_COST.model")));
    }

    @Test
    void costVariantWithExplicitAllTrainsOnlySupportedAlgorithms() throws Exception {
        Path sample = Path.of(getClass().getResource("/cli/train-sample-200.arff").toURI());
        Path models = temporaryDirectory.resolve("explicit-all-cost-models");

        int exit = CreditMinerCli.run(new String[]{
                        "train", "--train", sample.toString(), "--out", models.toString(),
                        "--algo", "ALL", "--variant", "cost", "--folds", "2", "--seed", "42"
                }, System.out, System.err, temporaryDirectory);

        assertEquals(0, exit);
        assertTrue(Files.isRegularFile(models.resolve("DECISIONTREE_COST.model")));
        assertTrue(Files.isRegularFile(models.resolve("RANDOMFOREST_COST.model")));
        assertTrue(Files.notExists(models.resolve("NAIVEBAYES_COST.model")));
        assertTrue(Files.notExists(models.resolve("LOGISTIC_COST.model")));
    }

    public static final class CountingClassifier extends AbstractClassifier {
        private static int predictions;

        @Override
        public void buildClassifier(Instances data) {
            // Pre-built deterministic test classifier.
        }

        @Override
        public double[] distributionForInstance(Instance instance) {
            predictions++;
            return new double[]{0.6, 0.4};
        }
    }
}
