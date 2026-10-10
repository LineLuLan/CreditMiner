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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Phase 2 cleaning and non-destructive data-quality reporting. */
@Slf4j
@Service
public class Preprocessor {

    private static final List<String> BILL_COLUMNS = List.of(
            "BILL_AMT1", "BILL_AMT2", "BILL_AMT3", "BILL_AMT4", "BILL_AMT5", "BILL_AMT6");

    @Getter
    private PreprocessReport lastReport;

    @Getter
    private boolean[] lastOutlierFlags = new boolean[0];

    /** Imputes, removes content duplicates, counts preserved negative bills, and flags IQR outliers. */
    public Instances run(Instances raw) {
        PreprocessReport report = new PreprocessReport();
        report.totalRowsIn = raw.numInstances();
        Instances data = imputeMissing(new Instances(raw), report);
        data = dropDuplicates(data, report);
        countNegativeBills(data, report);
        boolean[] flags = computeOutlierFlags(data, report);
        report.totalRowsOut = data.numInstances();
        lastReport = report;
        lastOutlierFlags = flags;
        log.info("Preprocessing complete: {} rows, {} duplicates removed, {} IQR outliers flagged",
                report.totalRowsOut, report.duplicatesDropped, report.outlierTotalCombined);
        return data;
    }

    public Instances imputeMissing(Instances data) {
        return imputeMissing(data, new PreprocessReport());
    }

    private Instances imputeMissing(Instances data, PreprocessReport report) {
        imputeNumericMedians(data, report);
        try {
            ReplaceMissingValues filter = new ReplaceMissingValues();
            filter.setInputFormat(data);
            return Filter.useFilter(data, filter);
        } catch (Exception e) {
            throw new IllegalStateException("Missing-value replacement failed", e);
        }
    }

    private void imputeNumericMedians(Instances data, PreprocessReport report) {
        for (int column = 0; column < data.numAttributes(); column++) {
            Attribute attribute = data.attribute(column);
            if (!attribute.isNumeric()) continue;
            int missing = data.attributeStats(column).missingCount;
            if (missing == 0) continue;
            double median = median(data, column);
            for (int row = 0; row < data.numInstances(); row++) {
                if (data.instance(row).isMissing(attribute)) data.instance(row).setValue(attribute, median);
            }
            report.numericMedianImputed.put(attribute.name(), missing);
        }
    }

    public Instances dropDuplicates(Instances data) {
        return dropDuplicates(data, new PreprocessReport());
    }

    private Instances dropDuplicates(Instances data, PreprocessReport report) {
        Attribute id = data.attribute("ID");
        Set<List<Long>> seen = new HashSet<>();
        Instances result = new Instances(data, data.numInstances());
        for (int rowIndex = 0; rowIndex < data.numInstances(); rowIndex++) {
            Instance row = data.instance(rowIndex);
            List<Long> signature = new ArrayList<>(data.numAttributes());
            for (int column = 0; column < data.numAttributes(); column++) {
                if (id != null && column == id.index()) continue;
                signature.add(Double.doubleToLongBits(row.value(column)));
            }
            if (seen.add(signature)) result.add(row);
            else report.duplicatesDropped++;
        }
        return result;
    }

    private void countNegativeBills(Instances data, PreprocessReport report) {
        for (String column : BILL_COLUMNS) {
            Attribute attribute = data.attribute(column);
            if (attribute == null) continue;
            int count = 0;
            for (int row = 0; row < data.numInstances(); row++) {
                if (!data.instance(row).isMissing(attribute) && data.instance(row).value(attribute) < 0) count++;
            }
            report.negativeBillByColumn.put(column, count);
            report.negativeBillTotal += count;
        }
    }

    public boolean[] flagOutliers(Instances data) {
        return computeOutlierFlags(data, new PreprocessReport());
    }

    private boolean[] computeOutlierFlags(Instances data, PreprocessReport report) {
        boolean[] flags = new boolean[data.numInstances()];
        for (int column = 0; column < data.numAttributes(); column++) {
            Attribute attribute = data.attribute(column);
            if (!attribute.isNumeric() || "ID".equals(attribute.name()) || column == data.classIndex()) continue;
            double[] values = Arrays.stream(data.attributeToDoubleArray(column))
                    .filter(Double::isFinite)
                    .toArray();
            if (values.length == 0) continue;
            double mean = mean(values);
            double standardDeviation = standardDeviation(values, mean);
            double[] sorted = Arrays.stream(values).sorted().toArray();
            double q1 = percentile(sorted, 0.25);
            double q3 = percentile(sorted, 0.75);
            double lowFence = q1 - 1.5 * (q3 - q1);
            double highFence = q3 + 1.5 * (q3 - q1);
            int zScoreCount = 0;
            int iqrCount = 0;
            for (int row = 0; row < data.numInstances(); row++) {
                double value = data.instance(row).value(attribute);
                if (!Double.isFinite(value)) continue;
                if (standardDeviation > 0 && Math.abs((value - mean) / standardDeviation) > 3) zScoreCount++;
                if (value < lowFence || value > highFence) {
                    iqrCount++;
                    flags[row] = true;
                }
            }
            report.outlierByColumn.put(attribute.name(), new OutlierColumnStats(
                    zScoreCount, iqrCount, iqrCount,
                    round(mean), round(standardDeviation), round(q1), round(q3)));
        }
        for (boolean flag : flags) if (flag) report.outlierTotalCombined++;
        report.outlierTotalCombinedPct = data.numInstances() == 0 ? 0
                : round((double) report.outlierTotalCombined / data.numInstances());
        return flags;
    }

    public Instances normalize(Instances data) {
        try {
            Normalize filter = new Normalize();
            filter.setInputFormat(data);
            return Filter.useFilter(data, filter);
        } catch (Exception e) {
            throw new IllegalStateException("Normalize filter failed", e);
        }
    }

    public Instances standardize(Instances data) {
        try {
            Standardize filter = new Standardize();
            filter.setInputFormat(data);
            return Filter.useFilter(data, filter);
        } catch (Exception e) {
            throw new IllegalStateException("Standardize filter failed", e);
        }
    }

    public Instances encodeNominal(Instances data) {
        try {
            NominalToBinary filter = new NominalToBinary();
            filter.setInputFormat(data);
            return Filter.useFilter(data, filter);
        } catch (Exception e) {
            throw new IllegalStateException("NominalToBinary filter failed", e);
        }
    }

    private static double median(Instances data, int attributeIndex) {
        double[] values = Arrays.stream(data.attributeToDoubleArray(attributeIndex))
                .filter(Double::isFinite)
                .sorted()
                .toArray();
        if (values.length == 0) return 0;
        int middle = values.length / 2;
        return values.length % 2 == 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
    }

    private static double mean(double[] values) {
        return Arrays.stream(values).average().orElse(0);
    }

    private static double standardDeviation(double[] values, double mean) {
        if (values.length < 2) return 0;
        double sum = 0;
        for (double value : values) sum += (value - mean) * (value - mean);
        return Math.sqrt(sum / (values.length - 1));
    }

    private static double percentile(double[] sorted, double probability) {
        if (sorted.length == 0) return Double.NaN;
        double position = probability * (sorted.length - 1);
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        return lower == upper ? sorted[lower]
                : sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
    }

    private static double round(double value) {
        return Double.isFinite(value) ? Math.round(value * 10000.0) / 10000.0 : value;
    }

    public static class PreprocessReport {
        public int totalRowsIn;
        public int totalRowsOut;
        public int duplicatesDropped;
        public final Map<String, Integer> numericMedianImputed = new LinkedHashMap<>();
        public final Map<String, Integer> negativeBillByColumn = new LinkedHashMap<>();
        public int negativeBillTotal;
        public final Map<String, OutlierColumnStats> outlierByColumn = new LinkedHashMap<>();
        public int outlierTotalCombined;
        public double outlierTotalCombinedPct;
    }

    public record OutlierColumnStats(
            int zscoreCount, int iqrCount, int combinedCount,
            double mean, double std, double q1, double q3) {
    }
}
