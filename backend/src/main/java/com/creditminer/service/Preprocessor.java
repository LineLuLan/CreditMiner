package com.creditminer.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.NominalToBinary;
import weka.filters.unsupervised.attribute.Normalize;
import weka.filters.unsupervised.attribute.ReplaceMissingValues;
import weka.filters.unsupervised.attribute.Standardize;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Phase 2 — Preprocessing (BE-20..BE-26).
 *
 * <p>Pipeline (in order):</p>
 * <ol>
 *   <li>Treat "Unknown" in 3 categorical columns as missing</li>
 *   <li>Impute: numeric → median, nominal → mode (blueprint §2.1)</li>
 *   <li>Drop duplicates by {@code CLIENTNUM} (typically zero)</li>
 *   <li>Flag outliers via Z-score (|z|>3) OR IQR-fence on 4 financial cols
 *       (blueprint §2.3) — flags are recorded but rows are NOT removed</li>
 * </ol>
 *
 * <p>Scaling and one-hot encoding ({@link #normalize}, {@link #standardize},
 * {@link #encodeNominal}) are NOT part of {@link #run(Instances)} — they are
 * thin wrappers callers invoke per-algorithm (KMeans needs Normalize, NB/Logistic
 * needs Standardize, Logistic on form input needs NominalToBinary).</p>
 *
 * <p>The most recent {@link #run(Instances)} populates {@link #getLastReport()} +
 * {@link #getLastOutlierFlags()} for the offline pipeline to serialize.</p>
 */
@Slf4j
@Service
public class Preprocessor {

    private static final List<String> CATEGORICAL_UNKNOWN_COLS = List.of(
            "Education_Level", "Marital_Status", "Income_Category"
    );

    private static final List<String> OUTLIER_COLS = List.of(
            "Credit_Limit", "Total_Trans_Amt", "Avg_Utilization_Ratio", "Total_Revolving_Bal"
    );

    @Getter
    private PreprocessReport lastReport;

    /** Aligned with the row order of the Instances returned by the most recent {@link #run(Instances)}. */
    @Getter
    private boolean[] lastOutlierFlags = new boolean[0];

    /** Runs the full pipeline and captures stats. Returns a new {@link Instances}. */
    public Instances run(Instances raw) {
        log.info("Preprocessor.run() — starting on {} instances × {} attributes",
                raw.numInstances(), raw.numAttributes());

        PreprocessReport report = new PreprocessReport();
        report.totalRowsIn = raw.numInstances();

        Instances data = new Instances(raw);
        data = imputeMissing(data, report);
        data = dropDuplicates(data, report);
        boolean[] flags = computeOutlierFlags(data, report);

        report.totalRowsOut = data.numInstances();
        this.lastReport = report;
        this.lastOutlierFlags = flags;

        log.info("Preprocessor.run() — done. {} rows out, {} duplicates dropped, {} outliers flagged",
                data.numInstances(), report.duplicatesDropped, report.outlierTotalCombined);
        return data;
    }

    // -------------------- BE-20: imputation --------------------

    public Instances imputeMissing(Instances data) {
        return imputeMissing(data, new PreprocessReport());
    }

    private Instances imputeMissing(Instances data, PreprocessReport report) {
        rewriteUnknownToMissing(data, report);
        imputeNumericMedians(data, report);
        try {
            ReplaceMissingValues rmv = new ReplaceMissingValues();
            rmv.setInputFormat(data);
            return Filter.useFilter(data, rmv);
        } catch (Exception e) {
            throw new IllegalStateException("ReplaceMissingValues filter failed", e);
        }
    }

    private void rewriteUnknownToMissing(Instances data, PreprocessReport report) {
        for (String colName : CATEGORICAL_UNKNOWN_COLS) {
            Attribute attr = data.attribute(colName);
            if (attr == null || !attr.isNominal()) continue;
            int unknownIdx = attr.indexOfValue("Unknown");
            if (unknownIdx < 0) continue;
            int count = 0;
            for (int i = 0; i < data.numInstances(); i++) {
                Instance inst = data.instance(i);
                if (!inst.isMissing(attr) && (int) inst.value(attr) == unknownIdx) {
                    inst.setMissing(attr);
                    count++;
                }
            }
            if (count > 0) {
                report.unknownRewritten.put(colName, count);
                log.info("Rewrote {} 'Unknown' values → missing in column {}", count, colName);
            }
        }
    }

    private void imputeNumericMedians(Instances data, PreprocessReport report) {
        for (int idx = 0; idx < data.numAttributes(); idx++) {
            Attribute attr = data.attribute(idx);
            if (!attr.isNumeric()) continue;
            int missing = data.attributeStats(idx).missingCount;
            if (missing == 0) continue;
            double median = computeMedian(data, idx);
            for (int i = 0; i < data.numInstances(); i++) {
                Instance inst = data.instance(i);
                if (inst.isMissing(attr)) inst.setValue(attr, median);
            }
            report.numericMedianImputed.put(attr.name(), missing);
            log.info("Imputed {} missing values in numeric column {} with median={}",
                    missing, attr.name(), median);
        }
    }

    private static double computeMedian(Instances data, int attrIdx) {
        double[] vals = Arrays.stream(data.attributeToDoubleArray(attrIdx))
                .filter(v -> !Double.isNaN(v))
                .sorted()
                .toArray();
        if (vals.length == 0) return 0.0;
        int mid = vals.length / 2;
        return vals.length % 2 == 0 ? (vals[mid - 1] + vals[mid]) / 2.0 : vals[mid];
    }

    // -------------------- BE-21: dedup --------------------

    public Instances dropDuplicates(Instances data) {
        return dropDuplicates(data, new PreprocessReport());
    }

    private Instances dropDuplicates(Instances data, PreprocessReport report) {
        Attribute key = data.attribute("CLIENTNUM");
        if (key == null) {
            log.warn("CLIENTNUM column missing — skipping dedup");
            return data;
        }
        Set<Double> seen = new HashSet<>();
        Instances out = new Instances(data, data.numInstances());
        int dropped = 0;
        for (int i = 0; i < data.numInstances(); i++) {
            double k = data.instance(i).value(key);
            if (seen.add(k)) {
                out.add(data.instance(i));
            } else {
                dropped++;
            }
        }
        report.duplicatesDropped = dropped;
        if (dropped > 0) log.info("Dropped {} duplicate rows by CLIENTNUM", dropped);
        return out;
    }

    // -------------------- BE-22/23: outlier flags --------------------

    /** Public single-arg form for ad-hoc use (e.g., Phase 6). */
    public boolean[] flagOutliers(Instances data) {
        return computeOutlierFlags(data, new PreprocessReport());
    }

    private boolean[] computeOutlierFlags(Instances data, PreprocessReport report) {
        boolean[] flags = new boolean[data.numInstances()];
        int totalCombined = 0;
        for (String colName : OUTLIER_COLS) {
            Attribute attr = data.attribute(colName);
            if (attr == null || !attr.isNumeric()) {
                log.warn("Outlier column '{}' missing or non-numeric — skipping", colName);
                continue;
            }
            double[] vals = data.attributeToDoubleArray(attr.index());
            double mean = mean(vals);
            double sd = stdDev(vals, mean);
            double[] sorted = Arrays.stream(vals).sorted().toArray();
            double q1 = percentile(sorted, 0.25);
            double q3 = percentile(sorted, 0.75);
            double iqr = q3 - q1;
            double lo = q1 - 1.5 * iqr;
            double hi = q3 + 1.5 * iqr;

            int z = 0, q = 0, c = 0;
            for (int i = 0; i < vals.length; i++) {
                if (Double.isNaN(vals[i])) continue;
                boolean isZ = sd > 0 && Math.abs((vals[i] - mean) / sd) > 3.0;
                boolean isQ = vals[i] < lo || vals[i] > hi;
                if (isZ) z++;
                if (isQ) q++;
                if (isZ || isQ) {
                    c++;
                    flags[i] = true;
                }
            }
            report.outlierByColumn.put(colName,
                    new OutlierColumnStats(z, q, c, round(mean), round(sd), round(q1), round(q3)));
        }
        for (boolean f : flags) if (f) totalCombined++;
        report.outlierTotalCombined = totalCombined;
        report.outlierTotalCombinedPct = data.numInstances() == 0
                ? 0.0 : round((double) totalCombined / data.numInstances());
        return flags;
    }

    // -------------------- BE-24/25/26: scaling + encoding wrappers --------------------

    public Instances normalize(Instances data) {
        try {
            Normalize n = new Normalize();
            n.setInputFormat(data);
            return Filter.useFilter(data, n);
        } catch (Exception e) {
            throw new IllegalStateException("Normalize filter failed", e);
        }
    }

    public Instances standardize(Instances data) {
        try {
            Standardize s = new Standardize();
            s.setInputFormat(data);
            return Filter.useFilter(data, s);
        } catch (Exception e) {
            throw new IllegalStateException("Standardize filter failed", e);
        }
    }

    public Instances encodeNominal(Instances data) {
        try {
            NominalToBinary n2b = new NominalToBinary();
            n2b.setInputFormat(data);
            return Filter.useFilter(data, n2b);
        } catch (Exception e) {
            throw new IllegalStateException("NominalToBinary filter failed", e);
        }
    }

    // -------------------- helpers --------------------

    private static double mean(double[] xs) {
        double s = 0; int n = 0;
        for (double x : xs) if (!Double.isNaN(x)) { s += x; n++; }
        return n == 0 ? 0 : s / n;
    }

    private static double stdDev(double[] xs, double mean) {
        double ss = 0; int n = 0;
        for (double x : xs) if (!Double.isNaN(x)) { ss += (x - mean) * (x - mean); n++; }
        return n < 2 ? 0 : Math.sqrt(ss / (n - 1));
    }

    /** Linear-interpolated percentile (matches numpy default). Assumes sorted, no NaNs. */
    private static double percentile(double[] sorted, double p) {
        if (sorted.length == 0) return Double.NaN;
        double pos = p * (sorted.length - 1);
        int lo = (int) Math.floor(pos);
        int hi = (int) Math.ceil(pos);
        if (lo == hi) return sorted[lo];
        return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }

    // -------------------- report types --------------------

    /** Snapshot of the most recent {@link #run(Instances)}. Public so Phase2Report can serialize it. */
    public static class PreprocessReport {
        public int totalRowsIn;
        public int totalRowsOut;
        public int duplicatesDropped;
        public final Map<String, Integer> unknownRewritten = new LinkedHashMap<>();
        public final Map<String, Integer> numericMedianImputed = new LinkedHashMap<>();
        public final Map<String, OutlierColumnStats> outlierByColumn = new LinkedHashMap<>();
        public int outlierTotalCombined;
        public double outlierTotalCombinedPct;
    }

    public record OutlierColumnStats(
            int zscoreCount, int iqrCount, int combinedCount,
            double mean, double std, double q1, double q3
    ) {}
}
