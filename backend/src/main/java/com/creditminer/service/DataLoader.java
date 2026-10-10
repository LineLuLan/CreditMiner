package com.creditminer.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;
import weka.core.converters.ArffSaver;
import weka.core.converters.CSVLoader;

import java.io.File;
import java.io.InputStream;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** I/O and schema normalization for the UCI credit-default dataset. */
@Slf4j
@Service
public class DataLoader {

    public static final String CLASS_COLUMN = "Default";
    private static final String SOURCE_CLASS_COLUMN = "default payment next month";

    @Getter
    private List<String> lastDroppedColumns = List.of();

    @Getter
    private Map<String, Object> lastTransformReport = Map.of();

    public Instances loadCsv(String csvPath) throws Exception {
        log.info("Loading CSV: {}", csvPath);
        CSVLoader loader = new CSVLoader();
        Instances source;
        try (InputStream input = Files.newInputStream(Path.of(csvPath))) {
            loader.setSource(input);
            source = loader.getDataSet();
        }
        Instances data = normalizeSchema(source);
        data.setClassIndex(data.attribute(CLASS_COLUMN).index());
        log.info("Loaded {} rows x {} columns; class={}",
                data.numInstances(), data.numAttributes(), data.classAttribute().name());
        return data;
    }

    public Instances loadArff(String arffPath) throws Exception {
        log.info("Loading ARFF: {}", arffPath);
        Instances data;
        try (Reader reader = Files.newBufferedReader(Path.of(arffPath))) {
            data = new Instances(reader);
        }
        Attribute classAttribute = data.attribute(CLASS_COLUMN);
        if (classAttribute != null) data.setClassIndex(classAttribute.index());
        return data;
    }

    public void saveArff(Instances data, String outPath) throws Exception {
        log.info("Saving ARFF: {} ({} instances)", outPath, data.numInstances());
        File out = new File(outPath);
        if (out.getParentFile() != null) out.getParentFile().mkdirs();
        ArffSaver saver = new ArffSaver();
        saver.setInstances(data);
        saver.setFile(out);
        saver.writeBatch();
    }

    private Instances normalizeSchema(Instances source) {
        require(source, "ID");
        require(source, "PAY_0");
        require(source, SOURCE_CLASS_COLUMN);

        ArrayList<Attribute> attributes = new ArrayList<>(source.numAttributes());
        for (int i = 0; i < source.numAttributes(); i++) {
            String sourceName = source.attribute(i).name();
            switch (sourceName) {
                case "PAY_0" -> attributes.add(new Attribute("PAY_1"));
                case "SEX" -> attributes.add(new Attribute("SEX",
                        new ArrayList<>(List.of("Male", "Female"))));
                case "EDUCATION" -> attributes.add(new Attribute("EDUCATION",
                        new ArrayList<>(List.of("Graduate", "University", "HighSchool", "Other"))));
                case "MARRIAGE" -> attributes.add(new Attribute("MARRIAGE",
                        new ArrayList<>(List.of("Married", "Single", "Other"))));
                case SOURCE_CLASS_COLUMN -> attributes.add(new Attribute(CLASS_COLUMN,
                        new ArrayList<>(List.of("No", "Yes"))));
                default -> attributes.add(new Attribute(sourceName));
            }
        }

        Instances normalized = new Instances("uci_credit_default", attributes, source.numInstances());
        Map<String, Integer> sexCounts = initializedCounts("Male", "Female");
        Map<String, Integer> educationCounts = initializedCounts(
                "Graduate", "University", "HighSchool", "Other");
        Map<String, Integer> marriageCounts = initializedCounts("Married", "Single", "Other");
        Map<String, Integer> defaultCounts = initializedCounts("No", "Yes");
        Map<String, Integer> sexSourceCodes = new LinkedHashMap<>();
        Map<String, Integer> educationSourceCodes = new LinkedHashMap<>();
        Map<String, Integer> marriageSourceCodes = new LinkedHashMap<>();
        Map<String, Integer> defaultSourceCodes = new LinkedHashMap<>();

        for (int row = 0; row < source.numInstances(); row++) {
            Instance input = source.instance(row);
            double[] values = new double[attributes.size()];
            for (int col = 0; col < source.numAttributes(); col++) {
                String sourceName = source.attribute(col).name();
                double value = input.value(col);
                switch (sourceName) {
                    case "SEX" -> {
                        int code = integerCode(input, source.attribute(col));
                        incrementCode(sexSourceCodes, code);
                        values[col] = nominalIndex(sexLabel(code), attributes.get(col), sexCounts);
                    }
                    case "EDUCATION" -> {
                        int code = integerCode(input, source.attribute(col));
                        incrementCode(educationSourceCodes, code);
                        values[col] = nominalIndex(educationLabel(code), attributes.get(col), educationCounts);
                    }
                    case "MARRIAGE" -> {
                        int code = integerCode(input, source.attribute(col));
                        incrementCode(marriageSourceCodes, code);
                        values[col] = nominalIndex(marriageLabel(code), attributes.get(col), marriageCounts);
                    }
                    case SOURCE_CLASS_COLUMN -> {
                        int code = integerCode(input, source.attribute(col));
                        incrementCode(defaultSourceCodes, code);
                        values[col] = nominalIndex(defaultLabel(code), attributes.get(col), defaultCounts);
                    }
                    default -> values[col] = value;
                }
            }
            normalized.add(new DenseInstance(input.weight(), values));
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("sourceRows", source.numInstances());
        report.put("sourceColumns", source.numAttributes());
        report.put("renamedColumns", Map.of(
                "PAY_0", "PAY_1",
                SOURCE_CLASS_COLUMN, CLASS_COLUMN));
        report.put("sexMappingCounts", sexCounts);
        report.put("sexSourceCodeCounts", sexSourceCodes);
        report.put("educationMappingCounts", educationCounts);
        report.put("educationSourceCodeCounts", educationSourceCodes);
        report.put("marriageMappingCounts", marriageCounts);
        report.put("marriageSourceCodeCounts", marriageSourceCodes);
        report.put("defaultMappingCounts", defaultCounts);
        report.put("defaultSourceCodeCounts", defaultSourceCodes);
        report.put("mappingRules", Map.of(
                "SEX", "1=Male, 2=Female",
                "EDUCATION", "1=Graduate, 2=University, 3=HighSchool, 0/4/5/6=Other",
                "MARRIAGE", "1=Married, 2=Single, 0/3=Other",
                SOURCE_CLASS_COLUMN, "0=No, 1=Yes"));
        report.put("idRetained", true);
        this.lastTransformReport = report;
        this.lastDroppedColumns = List.of();
        return normalized;
    }

    private static Map<String, Integer> initializedCounts(String... labels) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String label : labels) counts.put(label, 0);
        return counts;
    }

    private static int nominalIndex(String label, Attribute target, Map<String, Integer> counts) {
        counts.compute(label, (ignored, count) -> count == null ? 1 : count + 1);
        return target.indexOfValue(label);
    }

    private static void incrementCode(Map<String, Integer> counts, int code) {
        counts.merge(Integer.toString(code), 1, Integer::sum);
    }

    private static int integerCode(Instance row, Attribute attribute) {
        double value;
        if (attribute.isNominal() || attribute.isString()) {
            try {
                value = Double.parseDouble(row.stringValue(attribute));
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException(
                        "Expected integer code in " + attribute.name() + ": " + row.stringValue(attribute),
                        exception);
            }
        } else {
            value = row.value(attribute);
        }
        if (!Double.isFinite(value) || value != Math.rint(value)) {
            throw new IllegalArgumentException("Expected integer code in " + attribute.name() + ": " + value);
        }
        return (int) value;
    }

    private static String sexLabel(int code) {
        return switch (code) {
            case 1 -> "Male";
            case 2 -> "Female";
            default -> throw new IllegalArgumentException("Unsupported SEX code: " + code);
        };
    }

    private static String educationLabel(int code) {
        return switch (code) {
            case 1 -> "Graduate";
            case 2 -> "University";
            case 3 -> "HighSchool";
            case 0, 4, 5, 6 -> "Other";
            default -> throw new IllegalArgumentException("Unsupported EDUCATION code: " + code);
        };
    }

    private static String marriageLabel(int code) {
        return switch (code) {
            case 1 -> "Married";
            case 2 -> "Single";
            case 0, 3 -> "Other";
            default -> throw new IllegalArgumentException("Unsupported MARRIAGE code: " + code);
        };
    }

    private static String defaultLabel(int code) {
        return switch (code) {
            case 0 -> "No";
            case 1 -> "Yes";
            default -> throw new IllegalArgumentException("Unsupported default code: " + code);
        };
    }

    private static Attribute require(Instances data, String name) {
        Attribute attribute = data.attribute(name);
        if (attribute == null) throw new IllegalArgumentException("Required CSV column missing: " + name);
        return attribute;
    }
}
