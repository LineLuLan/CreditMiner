package com.creditminer.pipeline;

import com.creditminer.service.ClassificationService;
import com.creditminer.service.ClassificationService.Algo;
import com.creditminer.service.DataLoader;
import com.creditminer.service.Preprocessor;
import com.creditminer.service.Splitter;
import com.creditminer.service.Splitter.Split;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;
import weka.classifiers.trees.RandomForest;
import weka.core.Attribute;
import weka.core.Instances;
import weka.core.SerializationHelper;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OFFLINE Phase 5 — Classification (BE-50..BE-59).
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase5Pipeline"
 * }</pre>
 * Expect ~5–10 minutes wall time.</p>
 *
 * <p>Trains 10 model variants (4 algos × baseline + SMOTE, plus cost-sensitive
 * J48 and RF), records 10-fold CV + test-set metrics per variant, exports
 * comparison CSV + RF feature importance JSON, and persists each algo's
 * canonical .model file (best-of-variants) to {@code backend/models/}.</p>
 */
@Slf4j
public class Phase5Pipeline {

    private static final String DEFAULT_INPUT = "data/processed/enriched.arff";
    private static final String MODELS_DIR = "models";
    private static final String COMPARISON_CSV = "data/processed/phase5_comparison.csv";
    private static final String IMPORTANCE_JSON = "data/processed/phase5_feature_importance.json";

    private static final double TRAIN_RATIO = 0.8;
    private static final long SEED = 42;
    private static final int CV_FOLDS = 10;
    /** Class index for "Attrited Customer" — depends on ARFF nominal value order. */
    private static final String POSITIVE_CLASS = "Attrited Customer";

    public static void main(String[] args) throws Exception {
        String inputArff = args.length > 0 ? args[0] : DEFAULT_INPUT;

        log.info("=== Phase 5 — Classification ===");
        DataLoader loader = new DataLoader();
        Instances raw = loader.loadArff(inputArff);
        Attribute classAttr = raw.attribute("Attrition_Flag");
        if (classAttr == null) throw new IllegalStateException("Attrition_Flag missing on " + inputArff);
        raw.setClassIndex(classAttr.index());

        // Drop CLIENTNUM — ID, not a feature.
        Instances data = removeAttributes(raw, "CLIENTNUM");
        log.info("Loaded {} rows × {} features (CLIENTNUM dropped)",
                data.numInstances(), data.numAttributes());

        Preprocessor pre = new Preprocessor();
        Splitter splitter = new Splitter();
        ClassificationService cs = new ClassificationService(null, null);

        Split base = splitter.stratified(data, TRAIN_RATIO, SEED);
        Instances train = base.train();
        Instances test = base.test();

        int positiveIdx = data.classAttribute().indexOfValue(POSITIVE_CLASS);
        if (positiveIdx < 0) throw new IllegalStateException("Class label '" + POSITIVE_CLASS + "' missing");

        new File(MODELS_DIR).mkdirs();
        new File(COMPARISON_CSV).getParentFile().mkdirs();

        List<Map<String, Object>> rows = new ArrayList<>();
        Map<Algo, Classifier> bestPerAlgo = new LinkedHashMap<>();

        for (Algo algo : Algo.values()) {
            Instances trainPrep = preprocessFor(algo, train, pre);
            Instances testPrep = preprocessFor(algo, test, pre);
            Instances smoteTrain = preprocessFor(algo, cs.applySmote(train), pre);

            // Baseline
            Map<String, Object> baselineRow = trainAndScore(cs, algo, "baseline",
                    cs.build(algo), trainPrep, testPrep, positiveIdx);
            rows.add(baselineRow);
            bestPerAlgo.put(algo, (Classifier) baselineRow.get("__model"));

            // SMOTE variant
            Map<String, Object> smoteRow = trainAndScore(cs, algo, "smote",
                    cs.build(algo), smoteTrain, testPrep, positiveIdx);
            rows.add(smoteRow);
            // Prefer the SMOTE variant if it has a better F1-Attrited
            if (asDouble(smoteRow.get("test_f1_attrited"))
                    > asDouble(baselineRow.get("test_f1_attrited"))) {
                bestPerAlgo.put(algo, (Classifier) smoteRow.get("__model"));
            }
        }

        // Cost-sensitive J48 + RF (no preprocessing — tree-based)
        for (Algo algo : List.of(Algo.J48, Algo.RandomForest)) {
            Classifier base2 = cs.build(algo);
            Classifier wrapped = cs.costSensitive(base2);
            rows.add(trainAndScore(cs, algo, "cost", wrapped, train, test, positiveIdx));
        }

        // Persist canonical .model files (best baseline / SMOTE variant per algo).
        for (Map.Entry<Algo, Classifier> e : bestPerAlgo.entrySet()) {
            String path = MODELS_DIR + "/" + modelFileName(e.getKey());
            SerializationHelper.write(path, e.getValue());
            log.info("Saved {} → {}", e.getKey(), path);
        }

        writeComparisonCsv(rows);
        writeFeatureImportance(bestPerAlgo.get(Algo.RandomForest), train);
        printConsoleSummary(rows);
        log.info("=== Phase 5 DONE ===");
    }

    // -------------------- helpers --------------------

    private static Instances preprocessFor(Algo algo, Instances data, Preprocessor pre) {
        switch (algo) {
            case NaiveBayes:
            case Logistic: {
                // Standardize numerics; one-hot only for Logistic
                Instances std = pre.standardize(data);
                if (algo == Algo.Logistic) std = pre.encodeNominal(std);
                return std;
            }
            case J48:
            case RandomForest:
            default:
                return data;
        }
    }

    private static Map<String, Object> trainAndScore(
            ClassificationService cs, Algo algo, String variant,
            Classifier clf, Instances train, Instances test, int positiveIdx) throws Exception {

        log.info("--- {} {} ({} rows train, {} rows test) ---",
                algo, variant, train.numInstances(), test.numInstances());

        // CV first (uses an unbuilt copy)
        Evaluation cv = cs.crossValidate(cloneClassifier(clf), train, CV_FOLDS);

        // Then train on full train set + evaluate on test
        Evaluation testEval = cs.evaluate(clf, train, test);

        Map<String, Double> cvMetrics = ClassificationService.headline(cv, positiveIdx);
        Map<String, Double> testMetrics = ClassificationService.headline(testEval, positiveIdx);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("algo", algo.name());
        row.put("variant", variant);
        cvMetrics.forEach((k, v) -> row.put("cv_" + k, v));
        testMetrics.forEach((k, v) -> row.put("test_" + k, v));
        row.put("__model", clf);
        return row;
    }

    private static Classifier cloneClassifier(Classifier clf) throws Exception {
        return (Classifier) weka.core.Utils.forName(Classifier.class,
                clf.getClass().getName(),
                clf instanceof weka.core.OptionHandler oh ? oh.getOptions() : new String[0]);
    }

    private static Instances removeAttributes(Instances data, String... names) throws Exception {
        List<Integer> indices = new ArrayList<>();
        for (String n : names) {
            Attribute a = data.attribute(n);
            if (a != null) indices.add(a.index());
        }
        if (indices.isEmpty()) return data;
        Remove rm = new Remove();
        rm.setAttributeIndicesArray(indices.stream().mapToInt(Integer::intValue).toArray());
        rm.setInputFormat(data);
        return Filter.useFilter(data, rm);
    }

    private static String modelFileName(Algo algo) {
        return switch (algo) {
            case J48 -> "j48.model";
            case RandomForest -> "rf.model";
            case NaiveBayes -> "nb.model";
            case Logistic -> "logistic.model";
        };
    }

    private static double asDouble(Object o) {
        return o instanceof Number n ? n.doubleValue() : 0.0;
    }

    // -------------------- outputs --------------------

    private static void writeComparisonCsv(List<Map<String, Object>> rows) throws IOException {
        if (rows.isEmpty()) return;
        // Column order = first row's keys minus the __model placeholder
        List<String> headers = new ArrayList<>(rows.get(0).keySet());
        headers.remove("__model");

        try (Writer w = new FileWriter(COMPARISON_CSV)) {
            w.write(String.join(",", headers));
            w.write("\n");
            for (Map<String, Object> row : rows) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < headers.size(); i++) {
                    if (i > 0) sb.append(",");
                    Object v = row.get(headers.get(i));
                    sb.append(v == null ? "" : v.toString());
                }
                sb.append("\n");
                w.write(sb.toString());
            }
        }
        log.info("Wrote {}", COMPARISON_CSV);
    }

    private static void writeFeatureImportance(Classifier rfClassifier, Instances train) throws Exception {
        if (!(rfClassifier instanceof RandomForest rf)) {
            log.warn("Best RF variant is not a plain RandomForest — skipping feature importance");
            return;
        }
        double[] importance = new double[train.numAttributes()];
        try {
            rf.computeAverageImpurityDecreasePerAttribute(importance);
        } catch (Throwable t) {
            log.warn("RandomForest.computeAverageImpurityDecreasePerAttribute(double[]) failed: {}",
                    t.getMessage());
            return;
        }
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("model", "RandomForest");
        doc.put("metric", "MeanDecreaseImpurity");
        List<Map<String, Object>> ranking = new ArrayList<>();
        for (int i = 0; i < importance.length; i++) {
            if (i == train.classIndex()) continue;
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("name", train.attribute(i).name());
            e.put("importance", round(importance[i]));
            ranking.add(e);
        }
        ranking.sort((a, b) -> Double.compare(asDouble(b.get("importance")), asDouble(a.get("importance"))));
        doc.put("ranking", ranking);
        doc.put("generatedAt", Instant.now().toString());

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        File f = new File(IMPORTANCE_JSON);
        if (f.getParentFile() != null) f.getParentFile().mkdirs();
        mapper.writeValue(f, doc);
        log.info("Wrote {}", IMPORTANCE_JSON);
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 100000.0) / 100000.0;
    }

    private static void printConsoleSummary(List<Map<String, Object>> rows) {
        System.out.println();
        System.out.println("=== PHASE 5 SUMMARY ===");
        System.out.printf("%-14s %-9s %10s %10s %10s %10s %10s %10s%n",
                "Algo", "Variant",
                "CV F1", "CV ROC", "CV PR",
                "Test F1", "Test ROC", "Test PR");
        System.out.println("-".repeat(96));
        for (Map<String, Object> row : rows) {
            System.out.printf("%-14s %-9s %10.4f %10.4f %10.4f %10.4f %10.4f %10.4f%n",
                    row.get("algo"), row.get("variant"),
                    asDouble(row.get("cv_f1_attrited")),
                    asDouble(row.get("cv_roc_auc")),
                    asDouble(row.get("cv_pr_auc")),
                    asDouble(row.get("test_f1_attrited")),
                    asDouble(row.get("test_roc_auc")),
                    asDouble(row.get("test_pr_auc")));
        }
        System.out.println();
    }
}
