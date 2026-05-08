package com.creditminer.service;

import com.creditminer.dto.response.ChurnGroupResponse;
import com.creditminer.dto.response.CorrelationResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * EDA endpoints (Phase 4) — distribution, correlation, churn-by.
 * All computations are read-only over the cached {@link EdaDataCache} Instances.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EdaService {

    private static final int MIN_BINS = 5;
    private static final int MAX_BINS = 50;
    private static final int DEFAULT_BINS = 20;

    /** Whitelisted dim values for {@code /api/eda/churn-by} (BE_Handoff §3.4 + Phase 3 tier). */
    private static final Set<String> CHURN_BY_DIMS = Set.of(
            "Income_Category", "Card_Category", "Customer_Tier",
            "Gender", "Education_Level", "Marital_Status"
    );

    /** Skip ID-like cols when computing the correlation matrix. */
    private static final Set<String> CORRELATION_SKIP = Set.of("CLIENTNUM");

    private final EdaDataCache dataCache;

    private volatile CorrelationResponse cachedCorrelation;

    // -------------------- distribution --------------------

    public DistributionResponse distribution(String colName, Integer bins) {
        Instances data = dataCache.get();
        Attribute attr = requireAttribute(data, colName);
        int b = clamp(bins == null ? DEFAULT_BINS : bins, MIN_BINS, MAX_BINS);

        if (attr.isNumeric()) {
            return numericHistogram(data, attr, b);
        }
        if (attr.isNominal()) {
            return nominalCounts(data, attr);
        }
        throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                "Column '" + colName + "' is neither numeric nor nominal");
    }

    private DistributionResponse numericHistogram(Instances data, Attribute attr, int bins) {
        double[] vals = data.attributeToDoubleArray(attr.index());
        double min = Double.POSITIVE_INFINITY, max = Double.NEGATIVE_INFINITY;
        int present = 0;
        for (double v : vals) {
            if (Double.isNaN(v)) continue;
            if (v < min) min = v;
            if (v > max) max = v;
            present++;
        }
        if (present == 0) {
            return DistributionResponse.builder()
                    .column(attr.name()).type("numeric")
                    .binEdges(List.of()).counts(List.of()).build();
        }

        List<Double> edges = new ArrayList<>(bins + 1);
        if (max == min) {
            // Degenerate single-value column — emit one tiny bin.
            edges.add(min);
            edges.add(min + 1e-9);
        } else {
            double step = (max - min) / bins;
            for (int i = 0; i <= bins; i++) {
                edges.add(round(min + i * step, 6));
            }
        }
        int realBins = edges.size() - 1;
        int[] counts = new int[realBins];
        for (double v : vals) {
            if (Double.isNaN(v)) continue;
            int idx = (int) Math.floor((v - min) / Math.max(1e-12, max - min) * realBins);
            if (idx < 0) idx = 0;
            if (idx >= realBins) idx = realBins - 1;
            counts[idx]++;
        }
        List<Integer> countsList = new ArrayList<>(realBins);
        for (int c : counts) countsList.add(c);
        return DistributionResponse.builder()
                .column(attr.name())
                .type("numeric")
                .binEdges(edges)
                .counts(countsList)
                .build();
    }

    private DistributionResponse nominalCounts(Instances data, Attribute attr) {
        int[] counts = data.attributeStats(attr.index()).nominalCounts;
        List<String> categories = new ArrayList<>(attr.numValues());
        List<Integer> countsList = new ArrayList<>(attr.numValues());
        for (int i = 0; i < attr.numValues(); i++) {
            categories.add(attr.value(i));
            countsList.add(counts[i]);
        }
        return DistributionResponse.builder()
                .column(attr.name())
                .type("nominal")
                .categories(categories)
                .counts(countsList)
                .build();
    }

    // -------------------- correlation --------------------

    public CorrelationResponse correlation() {
        CorrelationResponse local = cachedCorrelation;
        if (local != null) return local;
        synchronized (this) {
            if (cachedCorrelation == null) {
                cachedCorrelation = computeCorrelation();
            }
            return cachedCorrelation;
        }
    }

    private CorrelationResponse computeCorrelation() {
        Instances data = dataCache.get();
        List<Integer> idx = new ArrayList<>();
        List<String> names = new ArrayList<>();
        for (int i = 0; i < data.numAttributes(); i++) {
            Attribute a = data.attribute(i);
            if (!a.isNumeric()) continue;
            if (CORRELATION_SKIP.contains(a.name())) continue;
            idx.add(i);
            names.add(a.name());
        }
        int n = idx.size();
        double[][] cols = new double[n][];
        double[] means = new double[n];
        double[] stds = new double[n];
        for (int j = 0; j < n; j++) {
            cols[j] = data.attributeToDoubleArray(idx.get(j));
            double[] ms = meanStd(cols[j]);
            means[j] = ms[0];
            stds[j] = ms[1];
        }
        double[][] m = new double[n][n];
        for (int j = 0; j < n; j++) {
            m[j][j] = 1.0;
            for (int k = j + 1; k < n; k++) {
                m[j][k] = pearson(cols[j], cols[k], means[j], means[k], stds[j], stds[k]);
                m[k][j] = m[j][k];
            }
        }
        log.info("Correlation matrix computed for {} numeric columns", n);
        return CorrelationResponse.builder().columns(names).matrix(m).build();
    }

    // -------------------- churn-by --------------------

    public List<ChurnGroupResponse> churnBy(String dim) {
        if (!CHURN_BY_DIMS.contains(dim)) {
            throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                    "dim must be one of " + CHURN_BY_DIMS + ", got '" + dim + "'");
        }
        Instances data = dataCache.get();
        Attribute dimAttr = requireAttribute(data, dim);
        if (!dimAttr.isNominal()) {
            throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                    "dim '" + dim + "' is not a nominal attribute");
        }
        Attribute classAttr = data.attribute("Attrition_Flag");
        if (classAttr == null) {
            throw new BusinessException("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR,
                    "Attrition_Flag column missing — cannot compute churn rate");
        }
        int attritedIdx = classAttr.indexOfValue("Attrited Customer");
        if (attritedIdx < 0) {
            throw new BusinessException("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR,
                    "Attrition_Flag missing 'Attrited Customer' level");
        }

        Map<String, int[]> agg = new LinkedHashMap<>();
        for (int i = 0; i < dimAttr.numValues(); i++) {
            agg.put(dimAttr.value(i), new int[2]);
        }
        for (int i = 0; i < data.numInstances(); i++) {
            Instance inst = data.instance(i);
            if (inst.isMissing(dimAttr)) continue;
            String key = dimAttr.value((int) inst.value(dimAttr));
            int[] cnt = agg.computeIfAbsent(key, k -> new int[2]);
            cnt[0]++;
            if (!inst.isMissing(classAttr) && (int) inst.value(classAttr) == attritedIdx) {
                cnt[1]++;
            }
        }
        List<ChurnGroupResponse> out = new ArrayList<>(agg.size());
        agg.forEach((group, c) -> out.add(ChurnGroupResponse.builder()
                .group(group)
                .count(c[0])
                .attritedCount(c[1])
                .churnRate(c[0] == 0 ? 0.0 : round((double) c[1] / c[0], 4))
                .build()));
        return out;
    }

    // -------------------- helpers --------------------

    private static Attribute requireAttribute(Instances data, String name) {
        Attribute a = data.attribute(name);
        if (a == null) {
            throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                    "Unknown column '" + name + "'");
        }
        return a;
    }

    private static int clamp(int v, int lo, int hi) {
        return v < lo ? lo : Math.min(v, hi);
    }

    private static double[] meanStd(double[] xs) {
        double s = 0; int n = 0;
        for (double x : xs) if (!Double.isNaN(x)) { s += x; n++; }
        if (n == 0) return new double[] { 0, 0 };
        double mean = s / n;
        double ss = 0;
        for (double x : xs) if (!Double.isNaN(x)) ss += (x - mean) * (x - mean);
        double std = n < 2 ? 0 : Math.sqrt(ss / (n - 1));
        return new double[] { mean, std };
    }

    private static double pearson(double[] a, double[] b, double ma, double mb, double sa, double sb) {
        if (sa == 0 || sb == 0) return 0.0;
        double cov = 0; int n = 0;
        for (int i = 0; i < a.length; i++) {
            if (Double.isNaN(a[i]) || Double.isNaN(b[i])) continue;
            cov += (a[i] - ma) * (b[i] - mb);
            n++;
        }
        if (n < 2) return 0.0;
        return round(cov / ((n - 1) * sa * sb), 4);
    }

    private static double round(double v, int decimals) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        double f = Math.pow(10, decimals);
        return Math.round(v * f) / f;
    }
}
