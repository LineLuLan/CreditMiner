package com.creditminer.pipeline;

import com.creditminer.sequence.SequenceBuilder;
import com.creditminer.sequence.SequenceFeaturePipeline;
import com.creditminer.sequence.SequenceMiner;
import com.creditminer.sequence.SequenceMiner.MiningResult;
import com.creditminer.sequence.SequencePatternSelector;
import com.creditminer.sequence.SequencePatternSelector.DiscriminativePattern;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Attribute;
import weka.core.Instances;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Phase 10 sequence-mining pipeline.
 *
 * <p>Context breadcrumb - intent: satisfy the assignment's sequence-mining requirement with the
 * ordered PAY_6..PAY_1 history; status: production pipeline; next: consume the generated JSON via
 * the read-only API/report; blockers: none known; confidence: high, backed by builder, matcher, GSP,
 * and controller tests.</p>
 */
@Slf4j
public final class Phase10Pipeline {

    public static final Path DEFAULT_INPUT = Path.of("data/processed/enriched.arff");
    public static final Path DEFAULT_TRAIN = Path.of("data/processed/train.arff");
    public static final Path DEFAULT_TEST = Path.of("data/processed/test.arff");
    public static final Path DEFAULT_OUT = Path.of("data/processed");
    public static final double DEFAULT_MIN_SUPPORT = 0.10;
    public static final int DEFAULT_TOP = 10;

    private static final ObjectMapper JSON = new ObjectMapper()
            .findAndRegisterModules()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private Phase10Pipeline() {
    }

    public static void main(String[] args) throws Exception {
        Path input = args.length > 0 ? Path.of(args[0]) : DEFAULT_INPUT;
        Path train = args.length > 1 ? Path.of(args[1]) : DEFAULT_TRAIN;
        Path test = args.length > 2 ? Path.of(args[2]) : DEFAULT_TEST;
        Path out = args.length > 3 ? Path.of(args[3]) : DEFAULT_OUT;
        double minSupport = args.length > 4 ? Double.parseDouble(args[4]) : DEFAULT_MIN_SUPPORT;
        int top = args.length > 5 ? Integer.parseInt(args[5]) : DEFAULT_TOP;
        run(input, train, test, out, minSupport, top);
    }

    public static Map<String, Object> run(
            Path inputPath,
            Path trainPath,
            Path testPath,
            Path outputDirectory,
            double minSupport,
            int top) throws Exception {
        if (!(minSupport > 0 && minSupport <= 1)) {
            throw new IllegalArgumentException("minSupport must be in (0, 1]");
        }
        if (top < 1) throw new IllegalArgumentException("top must be positive");
        Files.createDirectories(outputDirectory);
        Instances source = load(inputPath);
        Instances train = load(trainPath);
        Instances test = load(testPath);
        setClass(source);
        setClass(train);
        setClass(test);

        log.info("=== Phase 10 - Sequence Mining ===");
        long buildStart = System.nanoTime();
        SequenceBuilder builder = new SequenceBuilder();
        SequenceBuilder.BuildResult sequences = builder.build(source);
        builder.write(sequences,
                outputDirectory.resolve("sequences_default.arff"),
                outputDirectory.resolve("sequences_nondefault.arff"));
        long buildSequencesMs = elapsedMillis(buildStart);

        SequenceMiner miner = new SequenceMiner();
        long defaultStart = System.nanoTime();
        MiningResult defaultMining = miner.mine(
                sequences.defaultGsp(), sequences.defaultClients().size(), minSupport);
        long gspDefaultMs = elapsedMillis(defaultStart);
        long nonDefaultStart = System.nanoTime();
        MiningResult nonDefaultMining = miner.mine(
                sequences.nonDefaultGsp(), sequences.nonDefaultClients().size(), minSupport);
        long gspNonDefaultMs = elapsedMillis(nonDefaultStart);

        List<Map<String, Object>> joined = new SequencePatternSelector().join(
                        defaultMining, nonDefaultMining,
                        sequences.defaultClients(), sequences.nonDefaultClients())
                .stream().map(Phase10Pipeline::patternMap).toList();
        List<Map<String, Object>> topDefault = joined.stream()
                .filter(pattern -> intValue(pattern, "length") >= 2)
                .limit(15)
                .toList();
        List<Map<String, Object>> topNonDefault = joined.stream()
                .filter(pattern -> intValue(pattern, "length") >= 2)
                .sorted(Comparator
                        .comparingDouble((Map<String, Object> pattern) -> doubleValue(pattern, "supportDiff"))
                        .thenComparing(pattern -> pattern.get("pattern").toString()))
                .limit(15)
                .toList();

        Map<String, Object> experiment = new SequenceFeaturePipeline().run(
                train, test, minSupport, top,
                outputDirectory.resolve("train_seq.arff"),
                outputDirectory.resolve("test_seq.arff"));

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("generatedAt", Instant.now().toString());
        document.put("semanticsVersion", 2);
        document.put("changes", "April emits status only because March's bill is unobserved; NO_BALANCE separates non-positive reference bills from COVERED payments against a positive bill.");
        document.put("source", inputPath.toAbsolutePath().normalize().toString());
        document.put("minSupport", minSupport);
        document.put("itemMapping", SequenceBuilder.itemMapping());
        Map<String, Object> groups = new LinkedHashMap<>();
        groups.put("default", group(sequences.defaultClients().size(), defaultMining));
        groups.put("nonDefault", group(sequences.nonDefaultClients().size(), nonDefaultMining));
        document.put("groups", groups);
        document.put("patterns", joined);
        document.put("topDefaultPatterns", topDefault);
        document.put("topNonDefaultPatterns", topNonDefault);
        document.put("featureExperiment", experiment);
        Map<String, Object> runtime = new LinkedHashMap<>();
        runtime.put("buildSequencesMs", buildSequencesMs);
        runtime.put("gspDefaultMs", gspDefaultMs);
        runtime.put("gspNonDefaultMs", gspNonDefaultMs);
        document.put("runtime", runtime);

        Path jsonPath = outputDirectory.resolve("phase10_sequences.json");
        JSON.writeValue(jsonPath.toFile(), document);
        log.info("Wrote {} with {} joined patterns and {} sequence features",
                jsonPath, joined.size(), experiment.get("k"));
        return document;
    }

    private static Map<String, Object> patternMap(DiscriminativePattern pattern) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("pattern", pattern.pattern());
        row.put("length", pattern.length());
        row.put("supportDefault", pattern.supportDefault());
        row.put("supportNonDefault", pattern.supportNonDefault());
        row.put("supportDiff", pattern.supportDiff());
        row.put("ratio", pattern.ratio());
        return row;
    }

    private static Map<String, Object> group(int sequences, MiningResult result) {
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("sequences", sequences);
        group.put("frequentPatterns", result.patterns().size());
        group.put("minSupportUsed", result.minSupportUsed());
        return group;
    }

    private static Instances load(Path path) throws Exception {
        if (!Files.isRegularFile(path)) throw new IllegalArgumentException("ARFF file missing: " + path);
        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            return new Instances(reader);
        }
    }

    private static void setClass(Instances data) {
        Attribute target = data.attribute("Default");
        if (target == null) throw new IllegalArgumentException("Default class attribute missing");
        data.setClassIndex(target.index());
    }

    private static int intValue(Map<String, Object> row, String key) {
        return ((Number) row.get(key)).intValue();
    }

    private static double doubleValue(Map<String, Object> row, String key) {
        return ((Number) row.get(key)).doubleValue();
    }

    private static long elapsedMillis(long start) {
        return Math.max(0, Math.round((System.nanoTime() - start) / 1_000_000.0));
    }
}
