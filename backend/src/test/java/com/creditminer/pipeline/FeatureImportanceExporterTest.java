package com.creditminer.pipeline;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;
import weka.classifiers.CostMatrix;
import weka.classifiers.Evaluation;
import weka.classifiers.meta.CostSensitiveClassifier;
import weka.classifiers.meta.FilteredClassifier;
import weka.classifiers.trees.RandomForest;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import weka.filters.AllFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FeatureImportanceExporterTest {

    @Test
    void savedModelSelectionUsesTheNamedBestForestAndRejectsAnotherWinningAlgorithm() throws Exception {
        ObjectMapper json = new ObjectMapper();
        assertThat(FeatureImportanceReport.modelPath(json.readTree(
                "{\"algo\":\"RandomForest\",\"file\":\"RANDOMFOREST_SMOTE.model\"}")))
                .isEqualTo(Path.of("models", "RANDOMFOREST_SMOTE.model"));
        assertThatThrownBy(() -> FeatureImportanceReport.modelPath(json.readTree("{\"algo\":\"J48\"}")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not RandomForest");
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportsReturnedImpurityDecreasesSeparatelyFromSplitCounts() throws Exception {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("signal"));
        attributes.add(new Attribute("noise"));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances train = new Instances("importance", attributes, 30);
        train.setClassIndex(2);
        for (int i = 0; i < 30; i++) {
            train.add(new DenseInstance(1, new double[]{i, i % 3, i < 15 ? 0 : 1}));
        }
        RandomForest forest = new RandomForest();
        forest.setSeed(42);
        forest.setNumIterations(10);
        forest.setComputeAttributeImportance(true);
        FilteredClassifier filtered = new FilteredClassifier();
        filtered.setFilter(new AllFilter());
        filtered.setClassifier(forest);
        CostSensitiveClassifier cost = new CostSensitiveClassifier();
        CostMatrix matrix = new CostMatrix(2);
        matrix.setElement(1, 0, 5);
        cost.setCostMatrix(matrix);
        cost.setMinimizeExpectedCost(true);
        cost.setClassifier(filtered);
        cost.buildClassifier(train);
        forest = FeatureImportanceExporter.unwrap(cost);
        double[] counts = new double[train.numAttributes()];
        double[] importance = forest.computeAverageImpurityDecreasePerAttribute(counts);
        assertThat(Arrays.stream(importance).sum()).isPositive();
        assertThat(importance).isNotEqualTo(counts);

        Map<String, Object> document = FeatureImportanceExporter.document(cost, train, "cost");
        List<Map<String, Object>> ranking = (List<Map<String, Object>>) document.get("ranking");
        assertThat(document).containsEntry("model", "RandomForest")
                .containsEntry("variant", "cost").containsEntry("metric", "PermutationImportance");
        Evaluation expected = new Evaluation(train);
        expected.evaluateModel(cost, train);
        Map<String, Object> baseline = (Map<String, Object>) document.get("baseline");
        assertThat(baseline.get("rocAuc")).isEqualTo(expected.areaUnderROC(1));
        assertThat(baseline.get("f1Default")).isEqualTo(expected.fMeasure(1));
        assertThat(ranking).hasSize(2);
        double sum = 0;
        for (Map<String, Object> row : ranking) {
            int index = train.attribute(row.get("name").toString()).index();
            double actual = ((Number) row.get("impurityAvgPerSplit")).doubleValue();
            assertThat(actual).isEqualTo(importance[index]);
            if (counts[index] > 0) assertThat(actual).isNotEqualTo(counts[index]);
            assertThat(actual).isGreaterThanOrEqualTo(0);
            assertThat(row.get("impuritySplitCount")).isEqualTo(counts[index]);
            sum += actual;
        }
        assertThat(sum).isPositive();
    }

    @Test
    @SuppressWarnings("unchecked")
    void permutationRanksDeterminingSignalAndGivesIndependentNoiseZeroImportance() throws Exception {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("signal"));
        attributes.add(new Attribute("noise"));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances train = new Instances("signal-noise", attributes, 30);
        train.setClassIndex(2);
        for (int i = 0; i < 30; i++) {
            train.add(new DenseInstance(1, new double[]{i % 2, i % 3, i % 2}));
        }
        Instances holdout = new Instances(train, 0);
        for (int i = 0; i < 60; i++) {
            holdout.add(new DenseInstance(1, new double[]{i % 2, (i / 2) % 3, i % 2}));
        }
        String untouched = holdout.toString();
        RandomForest forest = new RandomForest();
        forest.setSeed(42);
        forest.setNumIterations(10);
        forest.setNumFeatures(2);
        forest.setComputeAttributeImportance(true);
        forest.buildClassifier(train);

        Map<String, Object> document = FeatureImportanceExporter.document(forest, holdout, "baseline");
        assertThat(document.get("metric")).isEqualTo("PermutationImportance");
        List<Map<String, Object>> ranking = (List<Map<String, Object>>) document.get("ranking");
        assertThat(ranking).hasSize(2);
        assertThat(ranking.get(0)).containsEntry("name", "signal").containsEntry("importance", 1.0);
        assertThat(((Number) ranking.get(0).get("aucDrop")).doubleValue()).isPositive();
        assertThat(((Number) ranking.get(0).get("aucDropStd")).doubleValue()).isPositive();
        assertThat(ranking.get(1)).containsEntry("name", "noise").containsEntry("importance", 0.0)
                .containsEntry("aucDrop", 0.0).containsEntry("f1Drop", 0.0);
        assertThat(holdout.toString()).isEqualTo(untouched);
        assertThat(FeatureImportanceExporter.document(forest, holdout, "baseline").get("ranking"))
                .isEqualTo(ranking);
    }
}
