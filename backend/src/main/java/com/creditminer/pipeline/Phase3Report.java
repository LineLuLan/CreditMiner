package com.creditminer.pipeline;

import com.creditminer.service.DataLoader;
import com.creditminer.service.FeatureEngineer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Attribute;
import weka.core.AttributeStats;
import weka.core.Instances;

import java.io.File;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OFFLINE Phase 3 — Feature Engineering (BE-30..BE-35).
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase3Report"
 * }</pre>
 * </p>
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Load Phase 2 ARFF ({@code data/processed/clean.arff})</li>
 *   <li>Run {@link FeatureEngineer#run(Instances)} — appends 6 derived columns</li>
 *   <li>Save {@code data/processed/enriched.arff}</li>
 *   <li>Save {@code data/processed/phase3_report.json} — per-feature summary stats</li>
 *   <li>Print console summary</li>
 * </ol>
 * </p>
 */
@Slf4j
public class Phase3Report {

    private static final String DEFAULT_INPUT_ARFF = "data/processed/clean.arff";
    private static final String DEFAULT_OUTPUT_ARFF = "data/processed/enriched.arff";
    private static final String DEFAULT_REPORT_JSON = "data/processed/phase3_report.json";

    private static final String[] DERIVED_FEATURES = {
            FeatureEngineer.F_UTILIZATION,
            FeatureEngineer.F_SPENDING,
            FeatureEngineer.F_ENGAGEMENT,
            FeatureEngineer.F_VALUE,
            FeatureEngineer.F_RISK,
            FeatureEngineer.F_TIER
    };

    public static void main(String[] args) throws Exception {
        String inputArff = args.length > 0 ? args[0] : DEFAULT_INPUT_ARFF;
        String outputArff = args.length > 1 ? args[1] : DEFAULT_OUTPUT_ARFF;
        String reportJson = args.length > 2 ? args[2] : DEFAULT_REPORT_JSON;

        log.info("=== Phase 3 — Feature Engineering ===");
        log.info("Input  : {}", inputArff);
        log.info("Output : {}", outputArff);
        log.info("Report : {}", reportJson);

        DataLoader loader = new DataLoader();
        Instances clean = loader.loadArff(inputArff);
        if (clean.classIndex() < 0) {
            Attribute classAttr = clean.attribute("Attrition_Flag");
            if (classAttr != null) clean.setClassIndex(classAttr.index());
        }
        log.info("Loaded {} rows × {} cols", clean.numInstances(), clean.numAttributes());

        FeatureEngineer fe = new FeatureEngineer();
        Instances enriched = fe.run(clean);

        loader.saveArff(enriched, outputArff);

        Map<String, Object> reportDoc = new LinkedHashMap<>();
        reportDoc.put("totalRows", enriched.numInstances());
        reportDoc.put("totalColumnsIn", clean.numAttributes());
        reportDoc.put("totalColumnsOut", enriched.numAttributes());
        reportDoc.put("derivedFeatures", buildFeatureStats(enriched));
        reportDoc.put("outputArff", outputArff);
        reportDoc.put("generatedAt", Instant.now().toString());

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        File rf = new File(reportJson);
        if (rf.getParentFile() != null) rf.getParentFile().mkdirs();
        mapper.writeValue(rf, reportDoc);
        log.info("Wrote {}", reportJson);

        printConsoleSummary(enriched);

        log.info("=== Phase 3 DONE ===");
    }

    private static List<Map<String, Object>> buildFeatureStats(Instances data) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (String name : DERIVED_FEATURES) {
            Attribute attr = data.attribute(name);
            if (attr == null) continue;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("name", name);
            AttributeStats s = data.attributeStats(attr.index());
            if (attr.isNumeric()) {
                entry.put("type", "numeric");
                entry.put("mean", round(s.numericStats.mean));
                entry.put("std", round(s.numericStats.stdDev));
                entry.put("min", round(s.numericStats.min));
                entry.put("max", round(s.numericStats.max));
            } else if (attr.isNominal()) {
                entry.put("type", "nominal");
                Map<String, Integer> counts = new LinkedHashMap<>();
                for (int i = 0; i < attr.numValues(); i++) {
                    counts.put(attr.value(i), s.nominalCounts[i]);
                }
                entry.put("counts", counts);
            }
            out.add(entry);
        }
        return out;
    }

    private static void printConsoleSummary(Instances data) {
        System.out.println();
        System.out.println("=== PHASE 3 SUMMARY ===");
        System.out.printf("Cols: %d total (%d derived added)%n",
                data.numAttributes(), DERIVED_FEATURES.length);
        System.out.println();
        System.out.printf("%-26s %-9s %14s %14s %14s %14s%n",
                "Feature", "Type", "Mean", "Std", "Min", "Max");
        System.out.println("-".repeat(96));
        for (String name : DERIVED_FEATURES) {
            Attribute attr = data.attribute(name);
            if (attr == null) continue;
            AttributeStats s = data.attributeStats(attr.index());
            if (attr.isNumeric()) {
                System.out.printf("%-26s %-9s %14.4f %14.4f %14.4f %14.4f%n",
                        name, "numeric",
                        s.numericStats.mean, s.numericStats.stdDev,
                        s.numericStats.min, s.numericStats.max);
            } else if (attr.isNominal()) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < attr.numValues(); i++) {
                    if (sb.length() > 0) sb.append(", ");
                    sb.append(attr.value(i)).append("=").append(s.nominalCounts[i]);
                }
                System.out.printf("%-26s %-9s %s%n", name, "nominal", sb);
            }
        }
        System.out.println();
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }
}
