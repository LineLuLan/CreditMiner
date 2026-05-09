package com.creditminer.service;

import com.creditminer.dto.response.ColumnStats;
import com.creditminer.dto.response.DescribeResponse;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.AttributeStats;
import weka.core.Instances;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Pure compute: Weka {@link Instances} → {@link DescribeResponse}.
 *
 * <p>Numeric stats come from Weka's {@link AttributeStats#numericStats}; median is
 * computed manually since Weka doesn't expose it. Nominal stats come from
 * {@code nominalCounts}.</p>
 */
@Service
public class DescribeService {

    private static final int DECIMALS = 4;

    public DescribeResponse describe(Instances data, List<String> droppedColumns) {
        List<ColumnStats> cols = new ArrayList<>(data.numAttributes());
        for (int i = 0; i < data.numAttributes(); i++) {
            cols.add(toColumnStats(data, i));
        }
        return DescribeResponse.builder()
                .totalRows(data.numInstances())
                .totalColumns(data.numAttributes())
                .classColumn(data.classIndex() >= 0 ? data.classAttribute().name() : null)
                .leakageColumnsDropped(droppedColumns == null ? List.of() : droppedColumns)
                .columns(cols)
                .generatedAt(Instant.now())
                .build();
    }

    private ColumnStats toColumnStats(Instances data, int idx) {
        Attribute attr = data.attribute(idx);
        AttributeStats stats = data.attributeStats(idx);
        int total = stats.totalCount;
        int missing = stats.missingCount;
        int present = total - missing;

        ColumnStats.ColumnStatsBuilder b = ColumnStats.builder()
                .name(attr.name())
                .count(present)
                .missing(missing)
                .missingPct(round(total == 0 ? 0.0 : (double) missing / total));

        if (attr.isNumeric()) {
            b.type("numeric")
                    .mean(round(stats.numericStats.mean))
                    .std(round(stats.numericStats.stdDev))
                    .min(round(stats.numericStats.min))
                    .max(round(stats.numericStats.max))
                    .median(round(median(data, idx)));
        } else if (attr.isNominal()) {
            int[] counts = stats.nominalCounts;
            int topIdx = topIndex(counts);
            b.type("nominal")
                    .distinctCount(attr.numValues())
                    .topValue(topIdx >= 0 ? attr.value(topIdx) : null)
                    .topCount(topIdx >= 0 ? counts[topIdx] : 0);
        } else if (attr.isString()) {
            b.type("string");
        } else if (attr.isDate()) {
            b.type("date");
        } else {
            b.type("other");
        }
        return b.build();
    }

    private static int topIndex(int[] counts) {
        if (counts == null || counts.length == 0) return -1;
        int top = 0;
        for (int i = 1; i < counts.length; i++) {
            if (counts[i] > counts[top]) top = i;
        }
        return top;
    }

    private static double median(Instances data, int idx) {
        double[] vals = data.attributeToDoubleArray(idx);
        double[] clean = Arrays.stream(vals).filter(v -> !Double.isNaN(v)).sorted().toArray();
        if (clean.length == 0) return Double.NaN;
        int mid = clean.length / 2;
        return clean.length % 2 == 0 ? (clean[mid - 1] + clean[mid]) / 2.0 : clean[mid];
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        double f = Math.pow(10, DECIMALS);
        return Math.round(v * f) / f;
    }
}
