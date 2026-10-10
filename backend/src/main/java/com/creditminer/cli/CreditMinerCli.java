package com.creditminer.cli;

import com.creditminer.pipeline.Phase1Report;
import com.creditminer.pipeline.Phase2Report;
import com.creditminer.pipeline.Phase3Report;
import com.creditminer.pipeline.Phase10Pipeline;
import com.creditminer.service.DataLoader;
import com.creditminer.service.ModelFactory;
import com.creditminer.service.ModelFactory.Algorithm;
import com.creditminer.service.ModelFactory.Variant;
import com.creditminer.service.Splitter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import weka.classifiers.AbstractClassifier;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;
import weka.core.SerializationHelper;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;

import java.io.PrintStream;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/** Spring-free command line entry point for preprocessing, training, and inference. */
public final class CreditMinerCli {

    private static final String POSITIVE_CLASS = "Yes";
    private static final ObjectMapper JSON = new ObjectMapper()
            .findAndRegisterModules()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private CreditMinerCli() {
    }

    public static void main(String[] args) {
        System.exit(run(args, System.out, System.err, Path.of("").toAbsolutePath().normalize()));
    }

    public static int run(String[] args, PrintStream out, PrintStream err, Path cwd) {
        if (args.length == 1 && ("help".equals(args[0]) || "-h".equals(args[0]) || "--help".equals(args[0]))) {
            usage(out);
            return 0;
        }
        if (args.length == 0) {
            usage(err);
            return 2;
        }
        try {
            String command = args[0].toLowerCase(Locale.ROOT);
            Options options = Options.parse(Arrays.copyOfRange(args, 1, args.length));
            if (options.help()) {
                usage(out);
                return 0;
            }
            return switch (command) {
                case "preprocess" -> preprocess(options, cwd, out);
                case "train" -> train(options, cwd, out);
                case "predict" -> predict(options, cwd, out);
                case "evaluate" -> evaluate(options, cwd, out);
                case "sequence" -> sequence(options, cwd, out);
                default -> throw new UsageException("Unknown command: " + args[0]);
            };
        } catch (UsageException exception) {
            err.println("Error: " + exception.getMessage());
            usage(err);
            return 2;
        } catch (Exception exception) {
            err.println("Error: " + rootMessage(exception));
            return 1;
        }
    }

    private static int preprocess(Options options, Path cwd, PrintStream out) throws Exception {
        options.requireOnly("input", "out", "seed", "train-ratio");
        Path input = requireInput(options, "input", cwd);
        Path output = resolve(options.required("out"), cwd);
        long seed = options.longValue("seed", 42);
        double ratio = options.doubleValue("train-ratio", 0.8);
        if (!(ratio > 0 && ratio < 1)) throw new UsageException("--train-ratio must be between 0 and 1");
        Files.createDirectories(output);

        Path rawArff = output.resolve("phase1_raw.arff");
        Path cleanArff = output.resolve("clean.arff");
        Path enrichedArff = output.resolve("enriched.arff");
        Phase1Report.run(input, rawArff, output.resolve("phase1_describe.json"));
        Phase2Report.run(rawArff, cleanArff, output.resolve("phase2_outliers.json"),
                output.resolve("phase2_report.json"));
        Phase3Report.run(cleanArff, enrichedArff, output.resolve("phase3_report.json"));

        Instances enriched = loadArff(enrichedArff);
        requireClass(enriched);
        Splitter.Split split = new Splitter().stratified(enriched, ratio, seed);
        DataLoader loader = new DataLoader();
        loader.saveArff(split.train(), output.resolve("train.arff").toString());
        loader.saveArff(split.test(), output.resolve("test.arff").toString());
        out.printf("Preprocessed %d rows into %s%n", enriched.numInstances(), output);
        out.printf("train rows: %d, test rows: %d, seed: %d%n",
                split.train().numInstances(), split.test().numInstances(), seed);
        return 0;
    }

    private static int train(Options options, Path cwd, PrintStream out) throws Exception {
        options.requireOnly("train", "test", "out", "algo", "variant", "folds", "seed");
        Path trainPath = requireInput(options, "train", cwd);
        Path testPath = options.has("test") ? requireInput(options, "test", cwd) : null;
        Path output = resolve(options.required("out"), cwd);
        int folds = options.intValue("folds", 10);
        int seed = options.intValue("seed", 42);
        if (folds < 2) throw new UsageException("--folds must be at least 2");

        EnumSet<Algorithm> algorithms = parseAlgorithms(options.value("algo", "ALL"));
        String variantOption = options.value("variant", "all").toLowerCase(Locale.ROOT);
        List<Variant> variants = parseVariants(variantOption);
        if (variantOption.equals("cost") && algorithms.stream().noneMatch(
                algorithm -> algorithm == Algorithm.DECISIONTREE || algorithm == Algorithm.RANDOMFOREST)) {
            throw new UsageException("--variant cost is supported only by DECISIONTREE and RANDOMFOREST");
        }

        Instances train = modelData(loadArff(trainPath));
        requireClass(train);
        if (folds > train.numInstances()) throw new UsageException("--folds exceeds the number of training rows");
        Instances test = testPath == null ? null : modelData(loadArff(testPath));
        if (test != null) requireCompatible(train, test);
        Files.createDirectories(output);

        List<Map<String, Object>> results = new ArrayList<>();
        ModelFactory factory = new ModelFactory();
        for (Algorithm algorithm : algorithms) {
            for (Variant variant : variants) {
                if (variant == Variant.cost
                        && algorithm != Algorithm.DECISIONTREE
                        && algorithm != Algorithm.RANDOMFOREST) continue;
                Classifier classifier = factory.create(algorithm, variant, seed);
                Evaluation cv = new Evaluation(train);
                Classifier cvClassifier = AbstractClassifier.makeCopy(classifier);
                long cvStart = System.nanoTime();
                cv.crossValidateModel(cvClassifier, train, folds, new Random(seed));
                long cvTimeMs = elapsedMillis(cvStart);

                long buildStart = System.nanoTime();
                classifier.buildClassifier(train);
                long buildTimeMs = elapsedMillis(buildStart);
                Path modelFile = output.resolve(ModelFactory.fileName(algorithm, variant));
                SerializationHelper.write(modelFile.toString(), classifier);

                TimedEvaluation holdout = test == null
                        ? TimedEvaluation.empty()
                        : timeEvaluation(classifier, train, test);
                Map<String, Object> row = metricRow(algorithm, variant, cv, holdout.evaluation(), train);
                row.put("trainTimeMs", buildTimeMs);
                row.put("buildTimeMs", buildTimeMs);
                row.put("cvTimeMs", cvTimeMs);
                row.put("testPredictTimeMs", holdout.predictTimeMs());
                row.put("testRows", test == null ? 0 : test.numInstances());
                row.put("predictMicrosPerRecord", microsPerRecord(
                        holdout.predictTimeMs(), test == null ? 0 : test.numInstances()));
                row.put("file", modelFile.getFileName().toString());
                results.add(row);
                out.printf("trained %s/%s -> %s (build=%d ms, cv=%d ms, predict=%d ms)%n",
                        algorithm, variant, modelFile, buildTimeMs, cvTimeMs, holdout.predictTimeMs());
            }
        }

        Map<String, Object> best = best(results);
        Map<String, Object> bestDocument = new LinkedHashMap<>();
        bestDocument.put("file", best.get("file"));
        bestDocument.put("algo", best.get("algo"));
        bestDocument.put("variant", best.get("variant"));
        bestDocument.put("selectionRule", "max CV F1 (Default=Yes), then CV ROC AUC, then fixed order");
        JSON.writeValue(output.resolve("best.json").toFile(), bestDocument);

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("trainFile", trainPath.toString());
        if (testPath != null) document.put("testFile", testPath.toString());
        document.put("folds", folds);
        document.put("seed", seed);
        document.put("positiveClass", POSITIVE_CLASS);
        document.put("variants", results);
        document.put("bestVariant", bestDocument);
        JSON.writeValue(output.resolve("evaluation.json").toFile(), document);
        writeCsv(output.resolve("evaluation.csv"), results);
        return 0;
    }

    private static int predict(Options options, Path cwd, PrintStream out) throws Exception {
        options.requireOnly("model", "test", "out");
        Path modelPath = requireInput(options, "model", cwd);
        Path testPath = requireInput(options, "test", cwd);
        Path output = options.has("out") ? resolve(options.required("out"), cwd) : null;
        PredictionRun run = predictionRun(modelPath, testPath);
        if (output == null) {
            writePredictions(new java.io.OutputStreamWriter(out, StandardCharsets.UTF_8), run);
        } else {
            if (output.getParent() != null) Files.createDirectories(output.getParent());
            try (Writer writer = Files.newBufferedWriter(output, StandardCharsets.UTF_8)) {
                writePredictions(writer, run);
            }
        }
        printPredictionSummary(out, run.summary());
        return 0;
    }

    private static int evaluate(Options options, Path cwd, PrintStream out) throws Exception {
        options.requireOnly("model", "test", "out");
        Path modelPath = requireInput(options, "model", cwd);
        Path testPath = requireInput(options, "test", cwd);
        PredictionRun run = predictionRun(modelPath, testPath);
        Path output = options.has("out") ? resolve(options.required("out"), cwd) : null;
        if (output == null) {
            JSON.writeValue(out, run.summary());
            out.println();
        } else {
            if (output.getParent() != null) Files.createDirectories(output.getParent());
            JSON.writeValue(output.toFile(), run.summary());
        }
        return 0;
    }

    private static int sequence(Options options, Path cwd, PrintStream out) throws Exception {
        options.requireOnly("input", "train", "test", "out", "min-support", "top");
        Path input = requireInput(options, "input", cwd);
        Path train = requireInput(options, "train", cwd);
        Path test = requireInput(options, "test", cwd);
        Path output = resolve(options.required("out"), cwd);
        double minSupport = options.doubleValue("min-support", Phase10Pipeline.DEFAULT_MIN_SUPPORT);
        int top = options.intValue("top", Phase10Pipeline.DEFAULT_TOP);
        if (!(minSupport > 0 && minSupport <= 1)) {
            throw new UsageException("--min-support must be in (0, 1]");
        }
        if (top < 1) throw new UsageException("--top must be positive");
        Phase10Pipeline.run(input, train, test, output, minSupport, top);
        out.printf("sequence mining complete -> %s%n", output.resolve("phase10_sequences.json"));
        return 0;
    }

    private static PredictionRun predictionRun(Path modelPath, Path testPath) throws Exception {
        long loadStart = System.nanoTime();
        Classifier classifier = (Classifier) SerializationHelper.read(modelPath.toString());
        long modelLoadMs = elapsedMillis(loadStart);

        Instances source = loadArff(testPath);
        Attribute idAttribute = source.attribute("ID");
        List<String> ids = new ArrayList<>(source.numInstances());
        for (Instance instance : source) {
            ids.add(idAttribute == null || instance.isMissing(idAttribute)
                    ? "" : csvNumber(instance.value(idAttribute)));
        }
        Instances data = modelData(source);
        requireClass(data);
        int yesIndex = data.classAttribute().indexOfValue(POSITIVE_CLASS);
        if (yesIndex < 0) throw new IllegalArgumentException("Class label 'Yes' missing in " + testPath);

        List<Prediction> predictions = new ArrayList<>(data.numInstances());
        Evaluation evaluation = hasLabeledInstances(data) ? new Evaluation(data) : null;
        long predictStart = System.nanoTime();
        for (int row = 0; row < data.numInstances(); row++) {
            Instance instance = data.instance(row);
            double[] distribution = classifier.distributionForInstance(instance);
            if (evaluation != null && !instance.classIsMissing()) {
                evaluation.evaluateModelOnceAndRecordPrediction(distribution, instance);
            }
            int predicted = maxIndex(distribution);
            predictions.add(new Prediction(row + 1, ids.get(row),
                    instance.classIsMissing() ? "" : instance.stringValue(data.classAttribute()),
                    data.classAttribute().value(predicted), distribution[yesIndex]));
        }
        long predictNanos = System.nanoTime() - predictStart;
        long predictTimeMs = nanosToMillis(predictNanos);
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("rows", data.numInstances());
        summary.put("model", stripExtension(modelPath.getFileName().toString()));
        summary.put("modelLoadMs", modelLoadMs);
        summary.put("totalPredictMs", predictTimeMs);
        summary.put("predictMicrosPerRecord", microsPerRecord(predictTimeMs, data.numInstances()));
        if (evaluation != null) summary.putAll(evaluationSummary(evaluation, data));
        return new PredictionRun(predictions, summary);
    }

    private static TimedEvaluation timeEvaluation(Classifier classifier, Instances train, Instances test)
            throws Exception {
        Evaluation evaluation = new Evaluation(train);
        long start = System.nanoTime();
        evaluation.evaluateModel(classifier, test);
        long nanos = System.nanoTime() - start;
        return new TimedEvaluation(evaluation, nanos, Math.max(1, Math.round(nanos / 1_000_000.0)));
    }

    private static Map<String, Object> metricRow(
            Algorithm algorithm, Variant variant, Evaluation cv, Evaluation test, Instances header) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("algo", algorithm.name());
        row.put("variant", variant.name());
        addMetrics(row, "cv_", cv, header);
        if (test != null) addMetrics(row, "test_", test, header);
        else for (String name : metricNames()) row.put("test_" + name, null);
        if (test != null) row.put("confusionMatrix", confusionMatrix(test, header));
        return row;
    }

    private static void addMetrics(Map<String, Object> row, String prefix, Evaluation evaluation, Instances data) {
        int yes = data.classAttribute().indexOfValue(POSITIVE_CLASS);
        row.put(prefix + "accuracy", round4(evaluation.pctCorrect() / 100.0));
        row.put(prefix + "precision_default", finite(evaluation.precision(yes)));
        row.put(prefix + "recall_default", finite(evaluation.recall(yes)));
        row.put(prefix + "f1_default", finite(evaluation.fMeasure(yes)));
        row.put(prefix + "roc_auc", finite(evaluation.areaUnderROC(yes)));
        row.put(prefix + "pr_auc", finite(evaluation.areaUnderPRC(yes)));
    }

    private static Map<String, Object> evaluationSummary(Evaluation evaluation, Instances data) {
        Map<String, Object> summary = new LinkedHashMap<>();
        int yes = data.classAttribute().indexOfValue(POSITIVE_CLASS);
        summary.put("accuracy", round4(evaluation.pctCorrect() / 100.0));
        summary.put("precision", finite(evaluation.precision(yes)));
        summary.put("recall", finite(evaluation.recall(yes)));
        summary.put("f1", finite(evaluation.fMeasure(yes)));
        summary.put("rocAuc", finite(evaluation.areaUnderROC(yes)));
        summary.put("confusionMatrix", confusionMatrix(evaluation, data));
        return summary;
    }

    private static Map<String, Object> confusionMatrix(Evaluation evaluation, Instances data) {
        int no = data.classAttribute().indexOfValue("No");
        int yes = data.classAttribute().indexOfValue(POSITIVE_CLASS);
        double[][] values = evaluation.confusionMatrix();
        Map<String, Object> matrix = new LinkedHashMap<>();
        matrix.put("labels", List.of("No", POSITIVE_CLASS));
        matrix.put("matrix", List.of(
                List.of(Math.round(values[no][no]), Math.round(values[no][yes])),
                List.of(Math.round(values[yes][no]), Math.round(values[yes][yes]))));
        return matrix;
    }

    private static void printPredictionSummary(PrintStream out, Map<String, Object> summary) {
        out.printf("rows: %s%n", summary.get("rows"));
        out.printf("model load ms: %s%n", summary.get("modelLoadMs"));
        out.printf("total predict ms: %s%n", summary.get("totalPredictMs"));
        out.printf(Locale.ROOT, "micros per record: %.2f%n", ((Number) summary.get("predictMicrosPerRecord")).doubleValue());
        if (summary.containsKey("accuracy")) {
            out.printf(Locale.ROOT, "accuracy: %.4f, precision: %.4f, recall: %.4f, F1: %.4f, ROC AUC: %.4f%n",
                    number(summary.get("accuracy")), number(summary.get("precision")),
                    number(summary.get("recall")), number(summary.get("f1")), number(summary.get("rocAuc")));
            out.println("confusion matrix [actual rows No/Yes, predicted columns No/Yes]: "
                    + summary.get("confusionMatrix"));
        }
    }

    private static void writePredictions(Writer writer, PredictionRun run) throws Exception {
        boolean hasId = run.predictions().stream().anyMatch(prediction -> !prediction.id().isBlank());
        writer.write(hasId ? "row,ID,actual,predicted,probYes\n" : "row,actual,predicted,probYes\n");
        for (Prediction prediction : run.predictions()) {
            writer.write(Integer.toString(prediction.row()));
            if (hasId) writer.write("," + csv(prediction.id()));
            writer.write("," + csv(prediction.actual()) + "," + csv(prediction.predicted())
                    + "," + String.format(Locale.ROOT, "%.8f", prediction.probYes()) + "\n");
        }
        writer.flush();
    }

    private static void writeCsv(Path path, List<Map<String, Object>> rows) throws Exception {
        if (rows.isEmpty()) return;
        List<String> headers = rows.get(0).keySet().stream()
                .filter(header -> !"confusionMatrix".equals(header)).toList();
        try (Writer writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(String.join(",", headers));
            writer.write("\n");
            for (Map<String, Object> row : rows) {
                for (int index = 0; index < headers.size(); index++) {
                    if (index > 0) writer.write(",");
                    Object value = row.get(headers.get(index));
                    writer.write(csv(value == null ? "" : value.toString()));
                }
                writer.write("\n");
            }
        }
    }

    private static Map<String, Object> best(List<Map<String, Object>> rows) {
        return rows.stream().min((left, right) -> {
            int f1 = Double.compare(number(right.get("cv_f1_default")), number(left.get("cv_f1_default")));
            if (f1 != 0) return f1;
            int roc = Double.compare(number(right.get("cv_roc_auc")), number(left.get("cv_roc_auc")));
            if (roc != 0) return roc;
            return left.get("file").toString().compareTo(right.get("file").toString());
        }).orElseThrow();
    }

    private static Instances loadArff(Path path) throws Exception {
        try (Reader reader = Files.newBufferedReader(path)) {
            Instances data = new Instances(reader);
            Attribute classAttribute = data.attribute(DataLoader.CLASS_COLUMN);
            if (classAttribute != null) data.setClassIndex(classAttribute.index());
            return data;
        }
    }

    private static Instances modelData(Instances source) throws Exception {
        Attribute id = source.attribute("ID");
        if (id == null) return source;
        Remove remove = new Remove();
        remove.setAttributeIndicesArray(new int[]{id.index()});
        remove.setInputFormat(source);
        Instances filtered = Filter.useFilter(source, remove);
        Attribute classAttribute = filtered.attribute(DataLoader.CLASS_COLUMN);
        if (classAttribute != null) filtered.setClassIndex(classAttribute.index());
        return filtered;
    }

    private static boolean hasLabeledInstances(Instances source) {
        for (Instance instance : source) if (!instance.classIsMissing()) return true;
        return false;
    }

    private static void requireClass(Instances data) {
        if (data.classIndex() < 0) throw new IllegalArgumentException("Required class attribute 'Default' is missing");
        if (data.classAttribute().indexOfValue(POSITIVE_CLASS) < 0) {
            throw new IllegalArgumentException("Class attribute 'Default' has no 'Yes' value");
        }
    }

    private static void requireCompatible(Instances train, Instances test) {
        String mismatch = train.equalHeadersMsg(test);
        if (mismatch != null) throw new IllegalArgumentException("Train/test schema mismatch: " + mismatch);
    }

    private static Path requireInput(Options options, String name, Path cwd) {
        Path path = resolve(options.required(name), cwd);
        if (!Files.isRegularFile(path)) throw new IllegalArgumentException("Input file not found: " + path);
        return path;
    }

    static Path resolve(String value, Path cwd) {
        Path path = Path.of(value);
        return (path.isAbsolute() ? path : cwd.resolve(path)).toAbsolutePath().normalize();
    }

    private static EnumSet<Algorithm> parseAlgorithms(String value) {
        if ("ALL".equalsIgnoreCase(value)) return EnumSet.allOf(Algorithm.class);
        try {
            return EnumSet.of(Algorithm.valueOf(value.toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException exception) {
            throw new UsageException("--algo must be ALL, DECISIONTREE, RANDOMFOREST, NAIVEBAYES, or LOGISTIC");
        }
    }

    private static List<Variant> parseVariants(String value) {
        if ("all".equalsIgnoreCase(value)) return List.of(Variant.baseline, Variant.smote, Variant.cost);
        try {
            return List.of(Variant.valueOf(value.toLowerCase(Locale.ROOT)));
        } catch (IllegalArgumentException exception) {
            throw new UsageException("--variant must be all, baseline, smote, or cost");
        }
    }

    private static List<String> metricNames() {
        return List.of("accuracy", "precision_default", "recall_default", "f1_default", "roc_auc", "pr_auc");
    }

    private static long elapsedMillis(long startNanos) {
        return Math.max(1, Math.round((System.nanoTime() - startNanos) / 1_000_000.0));
    }

    private static long nanosToMillis(long nanos) {
        return Math.max(1, Math.round(nanos / 1_000_000.0));
    }

    private static double microsPerRecord(long roundedMillis, int rows) {
        return rows == 0 ? 0.0 : Math.round((roundedMillis * 1_000.0 / rows) * 100.0) / 100.0;
    }

    private static Object finite(double value) {
        return Double.isFinite(value) ? round4(value) : null;
    }

    private static double round4(double value) {
        return Math.round(value * 10_000.0) / 10_000.0;
    }

    private static double number(Object value) {
        return value instanceof Number number ? number.doubleValue() : Double.NEGATIVE_INFINITY;
    }

    private static int maxIndex(double[] values) {
        int best = 0;
        for (int index = 1; index < values.length; index++) if (values[index] > values[best]) best = index;
        return best;
    }

    private static String csv(String value) {
        if (!value.contains(",") && !value.contains("\"") && !value.contains("\n")) return value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private static String csvNumber(double value) {
        return value == Math.rint(value) ? Long.toString(Math.round(value)) : Double.toString(value);
    }

    private static String stripExtension(String name) {
        return name.endsWith(".model") ? name.substring(0, name.length() - ".model".length()) : name;
    }

    private static String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) current = current.getCause();
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }

    private static void usage(PrintStream out) {
        out.println("CreditMiner CLI");
        out.println("  preprocess --input <raw.csv> --out <dir> [--seed 42] [--train-ratio 0.8]");
        out.println("  train --train <train.arff> [--test <test.arff>] --out <dir>");
        out.println("        [--algo ALL|DECISIONTREE|RANDOMFOREST|NAIVEBAYES|LOGISTIC]");
        out.println("        [--variant all|baseline|smote|cost] [--folds 10] [--seed 42]");
        out.println("  predict --model <file.model> --test <file.arff> [--out <predictions.csv>]");
        out.println("  evaluate --model <file.model> --test <file.arff> [--out <evaluation.json>]");
        out.println("  sequence --input <enriched.arff> --train <train.arff> --test <test.arff> --out <dir>");
        out.println("           [--min-support 0.10] [--top 10]");
        out.println("  help | -h | --help");
    }

    static final class Options {
        private final Map<String, String> values;
        private final boolean help;

        private Options(Map<String, String> values, boolean help) {
            this.values = values;
            this.help = help;
        }

        static Options parse(String[] args) {
            Map<String, String> values = new LinkedHashMap<>();
            boolean help = false;
            for (int index = 0; index < args.length; index++) {
                String token = args[index];
                if ("-h".equals(token) || "--help".equals(token)) {
                    help = true;
                    continue;
                }
                if (!token.startsWith("--") || token.length() == 2) {
                    throw new UsageException("Expected --flag value, got: " + token);
                }
                String name = token.substring(2);
                if (index + 1 >= args.length || args[index + 1].startsWith("--")) {
                    throw new UsageException("Missing value for --" + name);
                }
                if (values.putIfAbsent(name, args[++index]) != null) {
                    throw new UsageException("Duplicate flag: --" + name);
                }
            }
            return new Options(values, help);
        }

        void requireOnly(String... accepted) {
            List<String> allowed = List.of(accepted);
            for (String name : values.keySet()) {
                if (!allowed.contains(name)) throw new UsageException("Unknown flag: --" + name);
            }
        }

        String required(String name) {
            String value = values.get(name);
            if (value == null || value.isBlank()) throw new UsageException("Missing required flag: --" + name);
            return value;
        }

        boolean has(String name) {
            return values.containsKey(name);
        }

        boolean help() {
            return help;
        }

        String value(String name, String fallback) {
            return values.getOrDefault(name, fallback);
        }

        int intValue(String name, int fallback) {
            try {
                return Integer.parseInt(value(name, Integer.toString(fallback)));
            } catch (NumberFormatException exception) {
                throw new UsageException("--" + name + " must be an integer");
            }
        }

        long longValue(String name, long fallback) {
            try {
                return Long.parseLong(value(name, Long.toString(fallback)));
            } catch (NumberFormatException exception) {
                throw new UsageException("--" + name + " must be an integer");
            }
        }

        double doubleValue(String name, double fallback) {
            try {
                return Double.parseDouble(value(name, Double.toString(fallback)));
            } catch (NumberFormatException exception) {
                throw new UsageException("--" + name + " must be numeric");
            }
        }
    }

    private static final class UsageException extends IllegalArgumentException {
        private UsageException(String message) {
            super(message);
        }
    }

    private record Prediction(int row, String id, String actual, String predicted, double probYes) {
    }

    private record PredictionRun(List<Prediction> predictions, Map<String, Object> summary) {
    }

    private record TimedEvaluation(Evaluation evaluation, long predictTimeNanos, long predictTimeMs) {
        private static TimedEvaluation empty() {
            return new TimedEvaluation(null, 0, 0);
        }
    }
}
