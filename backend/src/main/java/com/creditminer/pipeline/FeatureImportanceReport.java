package com.creditminer.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import weka.classifiers.Classifier;
import weka.core.Instances;
import weka.core.SerializationHelper;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/** Regenerates feature importance from the saved forest without retraining or cross-validation. */
public final class FeatureImportanceReport {

    private FeatureImportanceReport() {
    }

    public static void main(String[] args) throws Exception {
        JsonNode best = new ObjectMapper().readTree(Path.of("models/best.json").toFile());
        Path model = modelPath(best);
        String variant = best.path("variant").asText("cost");
        Classifier classifier = (Classifier) SerializationHelper.read(model.toString());
        System.out.printf(Locale.ROOT, "Loaded %s; computeAttributeImportance=%s%n",
                model, FeatureImportanceExporter.unwrap(classifier).getComputeAttributeImportance());
        try (Reader reader = Files.newBufferedReader(Path.of("data/processed/train.arff"), StandardCharsets.UTF_8);
             Reader testReader = Files.newBufferedReader(Path.of("data/processed/test.arff"), StandardCharsets.UTF_8)) {
            Instances train = new Instances(reader);
            train.setClassIndex(train.attribute("Default").index());
            Instances holdout = new Instances(testReader);
            holdout.setClassIndex(holdout.attribute("Default").index());
            String mismatch = train.equalHeadersMsg(holdout);
            if (mismatch != null) throw new IllegalArgumentException("Train/holdout headers differ: " + mismatch);
            Path output = Path.of("data/processed/phase5_feature_importance.json");
            FeatureImportanceExporter.write(classifier, holdout, variant, output);
            System.out.printf(Locale.ROOT, "Wrote %s%n", output);
        }
    }

    static Path modelPath(JsonNode best) {
        if (!"RandomForest".equals(best.path("algo").asText())) {
            throw new IllegalArgumentException("Saved best model is not RandomForest: " + best.path("algo").asText());
        }
        return Path.of("models", best.path("file").asText("RANDOMFOREST_COST.model"));
    }
}
