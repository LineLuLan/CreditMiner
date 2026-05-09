package com.creditminer.pipeline;

import com.creditminer.dto.response.ColumnStats;
import com.creditminer.dto.response.DescribeResponse;
import com.creditminer.service.DataLoader;
import com.creditminer.service.DescribeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.core.Instances;

import java.io.File;

/**
 * OFFLINE Phase 1 — Data Understanding (BE-10..BE-13).
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase1Report"
 * }</pre>
 * </p>
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Load {@code data/raw/BankChurners.csv} via Weka CSVLoader (drops 2 leakage cols)</li>
 *   <li>Save cleaned {@code Instances} to {@code data/processed/phase1_raw.arff}</li>
 *   <li>Compute describe table (count, missing, mean, std, min, max, median for numeric;
 *       distinctCount, topValue, topCount for nominal)</li>
 *   <li>Print formatted table to console</li>
 *   <li>Write JSON to {@code data/processed/phase1_describe.json} for FE / cache warmup</li>
 * </ol>
 * </p>
 *
 * <p>NOT a Spring component — runs without booting the web server.</p>
 */
@Slf4j
public class Phase1Report {

    private static final String DEFAULT_CSV = "data/raw/BankChurners.csv";
    private static final String DEFAULT_ARFF = "data/processed/phase1_raw.arff";
    private static final String DEFAULT_JSON = "data/processed/phase1_describe.json";

    public static void main(String[] args) throws Exception {
        String csvPath = args.length > 0 ? args[0] : DEFAULT_CSV;
        String arffPath = args.length > 1 ? args[1] : DEFAULT_ARFF;
        String jsonPath = args.length > 2 ? args[2] : DEFAULT_JSON;

        log.info("=== Phase 1 — Data Understanding ===");
        log.info("CSV in : {}", csvPath);
        log.info("ARFF out: {}", arffPath);
        log.info("JSON out: {}", jsonPath);

        DataLoader loader = new DataLoader();
        Instances data = loader.loadCsv(csvPath);

        loader.saveArff(data, arffPath);

        DescribeService describer = new DescribeService();
        DescribeResponse report = describer.describe(data, loader.getLastDroppedColumns());

        printConsoleTable(report);

        File jsonFile = new File(jsonPath);
        if (jsonFile.getParentFile() != null) {
            jsonFile.getParentFile().mkdirs();
        }
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        mapper.writeValue(jsonFile, report);
        log.info("Wrote describe JSON: {} ({} columns)", jsonPath, report.getColumns().size());

        log.info("=== Phase 1 DONE ===");
    }

    private static void printConsoleTable(DescribeResponse r) {
        System.out.println();
        System.out.println("=== DESCRIBE TABLE ===");
        System.out.printf("Rows: %d | Cols: %d | Class: %s%n",
                r.getTotalRows(), r.getTotalColumns(),
                r.getClassColumn() == null ? "(none)" : r.getClassColumn());
        System.out.printf("Dropped leakage cols: %s%n", r.getLeakageColumnsDropped());
        System.out.println();
        System.out.printf("%-38s %-9s %7s %7s %8s %14s %14s %14s %14s%n",
                "Column", "Type", "Count", "Miss", "Miss%",
                "Mean / Top", "Std / Distinct", "Min / -", "Max / -");
        System.out.println("-".repeat(140));
        for (ColumnStats c : r.getColumns()) {
            String col1, col2, col3, col4;
            if ("numeric".equals(c.getType())) {
                col1 = String.format("%14.4f", c.getMean());
                col2 = String.format("%14.4f", c.getStd());
                col3 = String.format("%14.4f", c.getMin());
                col4 = String.format("%14.4f", c.getMax());
            } else if ("nominal".equals(c.getType())) {
                String top = c.getTopValue() == null ? "-" : c.getTopValue();
                if (top.length() > 14) top = top.substring(0, 11) + "...";
                col1 = String.format("%14s", top);
                col2 = String.format("%14d", c.getDistinctCount() == null ? 0 : c.getDistinctCount());
                col3 = String.format("%14s", "-");
                col4 = String.format("%14s", "-");
            } else {
                col1 = String.format("%14s", "-");
                col2 = String.format("%14s", "-");
                col3 = String.format("%14s", "-");
                col4 = String.format("%14s", "-");
            }
            System.out.printf("%-38s %-9s %7d %7d %7.2f%% %s %s %s %s%n",
                    truncate(c.getName(), 38),
                    c.getType(),
                    c.getCount(),
                    c.getMissing(),
                    c.getMissingPct() * 100,
                    col1, col2, col3, col4);
        }
        System.out.println();
    }

    private static String truncate(String s, int len) {
        if (s == null) return "";
        return s.length() > len ? s.substring(0, len - 3) + "..." : s;
    }
}
