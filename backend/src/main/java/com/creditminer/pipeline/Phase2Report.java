package com.creditminer.pipeline;

import com.creditminer.service.DataLoader;
import com.creditminer.service.Preprocessor;
import com.creditminer.service.Preprocessor.OutlierColumnStats;
import com.creditminer.service.Preprocessor.PreprocessReport;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Attribute;
import weka.core.Instances;

import java.io.File;
import java.time.Instant;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OFFLINE Phase 2 — Preprocessing (BE-20..BE-26).
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase2Report"
 * }</pre>
 * </p>
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Load Phase 1 ARFF (raw, leakage-free) from {@code data/processed/phase1_raw.arff}</li>
 *   <li>Run {@link Preprocessor#run(Instances)} → impute + dedup + outlier flags</li>
 *   <li>Save {@code data/processed/clean.arff}</li>
 *   <li>Save {@code data/processed/phase2_outliers.json} with IDs flagged as outliers
 *       (Phase 8 DatabaseSeeder reads this when populating customers.is_outlier)</li>
 *   <li>Save {@code data/processed/phase2_report.json} — summary stats</li>
 *   <li>Print console summary</li>
 * </ol>
 * </p>
 *
 * <p>NOT a Spring component. Runs without booting the web server.</p>
 */
@Slf4j
public class Phase2Report {

    private static final String DEFAULT_INPUT_ARFF = "data/processed/phase1_raw.arff";
    private static final String DEFAULT_CLEAN_ARFF = "data/processed/clean.arff";
    private static final String DEFAULT_OUTLIERS_JSON = "data/processed/phase2_outliers.json";
    private static final String DEFAULT_REPORT_JSON = "data/processed/phase2_report.json";

    public static void main(String[] args) throws Exception {
        Path inputArff = Path.of(args.length > 0 ? args[0] : DEFAULT_INPUT_ARFF);
        Path cleanArff = Path.of(args.length > 1 ? args[1] : DEFAULT_CLEAN_ARFF);
        Path outliersJson = Path.of(args.length > 2 ? args[2] : DEFAULT_OUTLIERS_JSON);
        Path reportJson = Path.of(args.length > 3 ? args[3] : DEFAULT_REPORT_JSON);
        run(inputArff, cleanArff, outliersJson, reportJson);
    }

    public static void run(Path inputArff, Path cleanArff, Path outliersJson, Path reportJson)
            throws Exception {

        log.info("=== Phase 2 — Preprocessing ===");
        log.info("Input ARFF : {}", inputArff);
        log.info("Clean ARFF : {}", cleanArff);
        log.info("Outliers   : {}", outliersJson);
        log.info("Report     : {}", reportJson);

        DataLoader loader = new DataLoader();
        Instances raw = loader.loadArff(inputArff.toString());
        if (raw.classIndex() < 0) {
            Attribute classAttr = raw.attribute("Default");
            if (classAttr != null) raw.setClassIndex(classAttr.index());
        }

        Preprocessor pre = new Preprocessor();
        Instances clean = pre.run(raw);
        PreprocessReport report = pre.getLastReport();
        boolean[] outlierFlags = pre.getLastOutlierFlags();

        loader.saveArff(clean, cleanArff.toString());

        Attribute idAttribute = clean.attribute("ID");
        List<Long> outlierClientIds = new ArrayList<>();
        if (idAttribute != null) {
            for (int i = 0; i < clean.numInstances(); i++) {
                if (outlierFlags[i]) {
                    outlierClientIds.add((long) clean.instance(i).value(idAttribute));
                }
            }
        }
        Map<String, Object> outliersDoc = new LinkedHashMap<>();
        outliersDoc.put("totalRows", clean.numInstances());
        outliersDoc.put("outlierCount", outlierClientIds.size());
        outliersDoc.put("outlierClientIds", outlierClientIds);

        Map<String, Object> reportDoc = new LinkedHashMap<>();
        reportDoc.put("totalRowsIn", report.totalRowsIn);
        reportDoc.put("totalRowsOut", report.totalRowsOut);
        reportDoc.put("duplicatesDropped", report.duplicatesDropped);
        reportDoc.put("numericMedianImputed", report.numericMedianImputed);
        reportDoc.put("negativeBillByColumn", report.negativeBillByColumn);
        reportDoc.put("negativeBillTotal", report.negativeBillTotal);
        reportDoc.put("duplicatesComparedWithout", "ID");
        reportDoc.put("outlierRule", "1.5 x IQR fences; rows flagged but retained");
        reportDoc.put("outlierByColumn", report.outlierByColumn);
        reportDoc.put("outlierTotalCombined", report.outlierTotalCombined);
        reportDoc.put("outlierTotalCombinedPct", report.outlierTotalCombinedPct);
        reportDoc.put("outputArff", cleanArff.toString());
        reportDoc.put("generatedAt", Instant.now().toString());

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        writeJson(mapper, outliersJson, outliersDoc);
        writeJson(mapper, reportJson, reportDoc);

        printConsoleSummary(report);

        log.info("=== Phase 2 DONE ===");
    }

    private static void writeJson(ObjectMapper mapper, Path path, Object doc) throws java.io.IOException {
        File f = path.toFile();
        if (f.getParentFile() != null) f.getParentFile().mkdirs();
        mapper.writeValue(f, doc);
        log.info("Wrote {}", path);
    }

    private static void printConsoleSummary(PreprocessReport r) {
        System.out.println();
        System.out.println("=== PHASE 2 SUMMARY ===");
        System.out.printf("Rows: %d in → %d out (%d duplicates dropped)%n",
                r.totalRowsIn, r.totalRowsOut, r.duplicatesDropped);

        if (!r.numericMedianImputed.isEmpty()) {
            System.out.println();
            System.out.println("Numeric median imputations:");
            r.numericMedianImputed.forEach((col, count) ->
                    System.out.printf("  %-20s %d%n", col, count));
        }

        System.out.println();
        System.out.printf("Outliers (1.5 x IQR fences, retained): %d (%.2f%%)%n",
                r.outlierTotalCombined, r.outlierTotalCombinedPct * 100);
        System.out.printf("Negative bill values retained: %d%n", r.negativeBillTotal);
        System.out.println();
        System.out.printf("%-26s %8s %8s %10s %12s %12s %12s %12s%n",
                "Column", "Z>3", "IQR", "Combined", "Mean", "Std", "Q1", "Q3");
        System.out.println("-".repeat(106));
        for (Map.Entry<String, OutlierColumnStats> e : r.outlierByColumn.entrySet()) {
            OutlierColumnStats s = e.getValue();
            System.out.printf("%-26s %8d %8d %10d %12.4f %12.4f %12.4f %12.4f%n",
                    e.getKey(), s.zscoreCount(), s.iqrCount(), s.combinedCount(),
                    s.mean(), s.std(), s.q1(), s.q3());
        }
        System.out.println();
    }
}
