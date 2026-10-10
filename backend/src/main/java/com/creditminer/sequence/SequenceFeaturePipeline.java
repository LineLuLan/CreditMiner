package com.creditminer.sequence;

import com.creditminer.service.ClassificationService;
import com.creditminer.service.ModelFactory;
import weka.classifiers.AbstractClassifier;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/** Adds binary GSP-subsequence features and evaluates J48/RandomForest with identical folds and seed. */
public final class SequenceFeaturePipeline {

    private static final int SEED = 42;
    private static final int FOLDS = 10;
    private static final String POSITIVE_CLASS = "Yes";

    public Map<String, Object> run(
            Instances trainSource,
            Instances testSource,
            double minSupport,
            int top,
            Path trainOutput,
            Path testOutput) throws Exception {
        long selectionStart = System.nanoTime();
        SequencePatternSelector selector = new SequencePatternSelector();
        SequencePatternSelector.Selection selection = selector.select(trainSource, minSupport, top);
        List<String> patternValues = selection.patterns();
        List<SequencePattern> patterns = patternValues.stream().map(SequencePattern::parse).toList();
        Instances trainWithSequences = addFeatures(trainSource, patterns);
        Instances testWithSequences = addFeatures(testSource, patterns);
        writeArff(trainWithSequences, trainOutput);
        writeArff(testWithSequences, testOutput);

        Instances baseTrain = modelData(trainSource);
        Instances baseTest = modelData(testSource);
        Instances sequenceTrain = modelData(trainWithSequences);
        Instances sequenceTest = modelData(testWithSequences);
        requireCompatible(baseTrain, baseTest);
        requireCompatible(sequenceTrain, sequenceTest);
        List<FoldData> sequenceFolds = prepareSequenceFolds(trainSource, minSupport, top, selector);
        long selectionTimeMs = elapsedMillis(selectionStart);

        List<Map<String, Object>> results = new ArrayList<>();
        for (ModelFactory.Algorithm algorithm : List.of(
                ModelFactory.Algorithm.DECISIONTREE, ModelFactory.Algorithm.RANDOMFOREST)) {
            results.add(evaluateBase(algorithm, baseTrain, baseTest));
            results.add(evaluateSequence(algorithm, sequenceTrain, sequenceTest, sequenceFolds));
        }

        Map<String, Object> experiment = new LinkedHashMap<>();
        experiment.put("k", patterns.size());
        experiment.put("patterns", patternValues);
        Map<String, Object> patternSelection = new LinkedHashMap<>();
        patternSelection.put("method",
                "holdout patterns selected on training rows; CV patterns reselected inside each training fold");
        patternSelection.put("requestedMinSupport", minSupport);
        patternSelection.put("holdoutDefaultMinSupportUsed", selection.minSupportDefault());
        patternSelection.put("holdoutNonDefaultMinSupportUsed", selection.minSupportNonDefault());
        patternSelection.put("selectionTimeMs", selectionTimeMs);
        experiment.put("patternSelection", patternSelection);
        experiment.put("results", results);
        return experiment;
    }

    public Instances addFeatures(Instances source, List<SequencePattern> patterns) {
        SequenceBuilder builder = new SequenceBuilder();
        ArrayList<Attribute> attributes = new ArrayList<>();
        for (int index = 0; index < source.numAttributes(); index++) {
            attributes.add((Attribute) source.attribute(index).copy());
        }
        int classIndex = source.classIndex() >= 0
                ? source.classIndex()
                : source.attribute("Default").index();
        for (int index = 0; index < patterns.size(); index++) {
            attributes.add(classIndex + index,
                    new Attribute("SEQ_" + (index + 1), new ArrayList<>(List.of("0", "1"))));
        }
        Instances enriched = new Instances(source.relationName() + "_seq", attributes, source.numInstances());
        enriched.setClassIndex(classIndex + patterns.size());

        for (Instance original : source) {
            List<SequenceBuilder.SequenceElement> elements = builder.sequenceElements(original);
            double[] values = new double[enriched.numAttributes()];
            for (int index = 0; index < classIndex; index++) values[index] = original.value(index);
            for (int index = 0; index < patterns.size(); index++) {
                values[classIndex + index] = patterns.get(index).isContainedBy(elements) ? 1 : 0;
            }
            for (int index = classIndex; index < source.numAttributes(); index++) {
                values[index + patterns.size()] = original.value(index);
            }
            enriched.add(new DenseInstance(original.weight(), values));
        }
        return enriched;
    }

    private static List<FoldData> prepareSequenceFolds(
            Instances source,
            double minSupport,
            int top,
            SequencePatternSelector selector) throws Exception {
        Instances randomized = new Instances(source);
        Attribute target = randomized.attribute("Default");
        if (target == null) throw new IllegalArgumentException("Default class attribute is missing");
        randomized.setClassIndex(target.index());
        randomized.randomize(new Random(SEED));
        if (randomized.classAttribute().isNominal()) randomized.stratify(FOLDS);
        List<FoldData> folds = new ArrayList<>(FOLDS);
        for (int fold = 0; fold < FOLDS; fold++) {
            Instances rawTrain = randomized.trainCV(FOLDS, fold);
            Instances rawValidation = randomized.testCV(FOLDS, fold);
            List<String> values = selector.select(rawTrain, minSupport, top).patterns();
            if (values.size() != top) {
                throw new IllegalStateException("Fold " + fold + " produced " + values.size()
                        + " sequence patterns; expected " + top);
            }
            List<SequencePattern> patterns = values.stream().map(SequencePattern::parse).toList();
            folds.add(new FoldData(
                    modelData(new SequenceFeaturePipeline().addFeatures(rawTrain, patterns)),
                    modelData(new SequenceFeaturePipeline().addFeatures(rawValidation, patterns))));
        }
        return List.copyOf(folds);
    }

    private static Map<String, Object> evaluateBase(
            ModelFactory.Algorithm algorithm,
            Instances train,
            Instances test) throws Exception {
        ModelFactory factory = new ModelFactory();
        Classifier classifier = factory.create(algorithm, ModelFactory.Variant.baseline, SEED);
        Classifier cvClassifier = AbstractClassifier.makeCopy(classifier);
        Evaluation cv = new Evaluation(train);
        long cvStart = System.nanoTime();
        cv.crossValidateModel(cvClassifier, train, FOLDS, new Random(SEED));
        long cvTimeMs = elapsedMillis(cvStart);

        long buildStart = System.nanoTime();
        classifier.buildClassifier(train);
        long buildTimeMs = elapsedMillis(buildStart);
        Evaluation holdout = new Evaluation(train);
        holdout.evaluateModel(classifier, test);
        return result(algorithm, "base", train, cv, holdout, buildTimeMs, cvTimeMs);
    }

    private static Map<String, Object> evaluateSequence(
            ModelFactory.Algorithm algorithm,
            Instances train,
            Instances test,
            List<FoldData> folds) throws Exception {
        ModelFactory factory = new ModelFactory();
        List<Classifier> foldClassifiers = new ArrayList<>(folds.size());
        for (int index = 0; index < folds.size(); index++) {
            foldClassifiers.add(factory.create(algorithm, ModelFactory.Variant.baseline, SEED));
        }
        Evaluation cv = new Evaluation(train);
        long cvStart = System.nanoTime();
        for (int index = 0; index < folds.size(); index++) {
            FoldData fold = folds.get(index);
            Classifier foldClassifier = foldClassifiers.get(index);
            foldClassifier.buildClassifier(fold.train());
            cv.evaluateModel(foldClassifier, fold.validation());
        }
        long cvTimeMs = elapsedMillis(cvStart);

        Classifier classifier = factory.create(algorithm, ModelFactory.Variant.baseline, SEED);
        long buildStart = System.nanoTime();
        classifier.buildClassifier(train);
        long buildTimeMs = elapsedMillis(buildStart);
        Evaluation holdout = new Evaluation(train);
        holdout.evaluateModel(classifier, test);
        return result(algorithm, "base+seq", train, cv, holdout, buildTimeMs, cvTimeMs);
    }

    private static Map<String, Object> result(
            ModelFactory.Algorithm algorithm,
            String features,
            Instances train,
            Evaluation cv,
            Evaluation holdout,
            long buildTimeMs,
            long cvTimeMs) {
        int positive = train.classAttribute().indexOfValue(POSITIVE_CLASS);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("algo", algorithm.name());
        result.put("features", features);
        result.put("cv", metrics(cv, positive));
        result.put("test", metrics(holdout, positive));
        result.put("buildTimeMs", buildTimeMs);
        result.put("cvTimeMs", cvTimeMs);
        return result;
    }

    private static Map<String, Object> metrics(Evaluation evaluation, int positive) {
        Map<String, Double> headline = ClassificationService.headline(evaluation, positive);
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("accuracy", finite(headline.get("accuracy")));
        metrics.put("precision", finite(headline.get("precision_default")));
        metrics.put("recall", finite(headline.get("recall_default")));
        metrics.put("f1", finite(headline.get("f1_default")));
        metrics.put("rocAuc", finite(headline.get("roc_auc")));
        metrics.put("prAuc", finite(headline.get("pr_auc")));
        return metrics;
    }

    private static Object finite(Double value) {
        return value != null && Double.isFinite(value) ? value : null;
    }

    private static Instances modelData(Instances source) throws Exception {
        Instances data = new Instances(source);
        Attribute target = data.attribute("Default");
        if (target == null) throw new IllegalArgumentException("Default class attribute is missing");
        data.setClassIndex(target.index());
        Attribute id = data.attribute("ID");
        if (id == null) return data;
        Remove remove = new Remove();
        remove.setAttributeIndicesArray(new int[]{id.index()});
        remove.setInputFormat(data);
        Instances filtered = Filter.useFilter(data, remove);
        filtered.setClassIndex(filtered.attribute("Default").index());
        return filtered;
    }

    private static void requireCompatible(Instances train, Instances test) {
        String mismatch = train.equalHeadersMsg(test);
        if (mismatch != null) throw new IllegalArgumentException("Train/test headers differ: " + mismatch);
    }

    private static void writeArff(Instances data, Path path) throws IOException {
        if (path.getParent() != null) Files.createDirectories(path.getParent());
        try (Writer writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(data.toString());
        }
    }

    private static long elapsedMillis(long start) {
        return Math.max(0, Math.round((System.nanoTime() - start) / 1_000_000.0));
    }

    private record FoldData(Instances train, Instances validation) {
    }
}
