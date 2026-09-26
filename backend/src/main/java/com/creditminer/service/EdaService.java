package com.creditminer.service;

import com.creditminer.dto.response.ChurnGroupResponse;
import com.creditminer.dto.response.CorrelationResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.dto.response.PcaPointResponse;
import com.creditminer.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

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
    private static final List<String> CHURN_BY_DIMS = List.of(
            "Income_Category", "Card_Category", "Customer_Tier",
            "Gender", "Education_Level", "Marital_Status",
            "Months_Inactive_12_mon", "Contacts_Count_12_mon",
            "Total_Relationship_Count", "Dependent_count"
    );
    private static final Set<String> INTEGER_CHURN_BY_DIMS = Set.of(
            "Months_Inactive_12_mon", "Contacts_Count_12_mon",
            "Total_Relationship_Count", "Dependent_count"
    );

    /** Skip ID-like cols when computing the correlation matrix. */
    private static final Set<String> CORRELATION_SKIP = Set.of("CLIENTNUM");

    private final EdaDataCache dataCache;

    @Value("${creditminer.data.phase6-pca-json:data/processed/phase6_pca_2d.json}")
    private String pcaJsonPath;

    private volatile CorrelationResponse cachedCorrelation;
    private volatile List<PcaPointResponse> cachedPca;
    private final ObjectMapper mapper = new ObjectMapper();

    // -------------------- pca-2d (Phase 6 sidecar) --------------------

    /**
     * Loads first-2-PC scatter coordinates from
     * {@code data/processed/phase6_pca_2d.json}, cached after first call.
     * Re-run {@code Phase6Pipeline} to refresh — invalidate via {@link #invalidatePca()}.
     */
    public List<PcaPointResponse> pca2d() {
        List<PcaPointResponse> local = cachedPca;
        if (local != null) return local;
        synchronized (this) {
            if (cachedPca == null) cachedPca = loadPca();
            return cachedPca;
        }
    }

    public synchronized void invalidatePca() {
        cachedPca = null;
    }

    private List<PcaPointResponse> loadPca() {
        File f = new File(pcaJsonPath);
        if (!f.exists()) {
            throw new BusinessException("REPORT_NOT_GENERATED", HttpStatus.SERVICE_UNAVAILABLE,
                    "PCA-2D file missing at " + pcaJsonPath + ". Run Phase 6 to generate.");
        }
        try {
            JsonNode root = mapper.readTree(f);
            JsonNode points = root.get("points");
            if (points == null || !points.isArray()) {
                throw new BusinessException("REPORT_NOT_GENERATED", HttpStatus.SERVICE_UNAVAILABLE,
                        "PCA file " + pcaJsonPath + " has no 'points' array");
            }
            List<PcaPointResponse> out = new ArrayList<>(points.size());
            for (JsonNode p : points) {
                out.add(new PcaPointResponse(
                        p.get("clientNum").asLong(),
                        p.get("clusterId").asInt(),
                        p.get("x").asDouble(),
                        p.get("y").asDouble()));
            }
            log.info("EDA pca-2d loaded: {} points from {}", out.size(), pcaJsonPath);
            return out;
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.error("Failed to load PCA-2D file", ex);
            throw new BusinessException("REPORT_NOT_GENERATED", HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to read PCA file: " + ex.getMessage());
        }
    }

    // -------------------- distribution --------------------

    public DistributionResponse distribution(String colName, Integer bins) {
        return distribution(colName, bins, null);
    }

    public DistributionResponse distribution(String colName, Integer bins, String split) {
        Instances data = dataCache.get();
        Attribute attr = requireAttribute(data, colName);
        Attribute splitAttr = null;
        if (split != null) {
            if (!"Attrition_Flag".equals(split)) {
                throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                        "split must be Attrition_Flag, got '" + split + "'");
            }
            splitAttr = requireAttribute(data, split);
            if (!splitAttr.isNominal()) {
                throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                        "split '" + split + "' is not a nominal attribute");
            }
        }
        int b = clamp(bins == null ? DEFAULT_BINS : bins, MIN_BINS, MAX_BINS);

        if (attr.isNumeric()) {
            return numericHistogram(data, attr, b, splitAttr);
        }
        if (attr.isNominal()) {
            return nominalCounts(data, attr, splitAttr);
        }
        throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                "Column '" + colName + "' is neither numeric nor nominal");
    }

    private DistributionResponse numericHistogram(Instances data, Attribute attr, int bins, Attribute splitAttr) {
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
                    .binEdges(List.of()).counts(List.of())
                    .stats(summaryStats(vals)).series(splitSeriesNumeric(data, attr, splitAttr, List.of()))
                    .build();
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
            counts[histogramIndex(v, edges)]++;
        }
        List<Integer> countsList = new ArrayList<>(realBins);
        for (int c : counts) countsList.add(c);
        return DistributionResponse.builder()
                .column(attr.name())
                .type("numeric")
                .binEdges(edges)
                .counts(countsList)
                .stats(summaryStats(vals))
                .series(splitSeriesNumeric(data, attr, splitAttr, edges))
                .build();
    }

    private DistributionResponse nominalCounts(Instances data, Attribute attr, Attribute splitAttr) {
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
                .stats(null)
                .series(splitSeriesNominal(data, attr, splitAttr))
                .build();
    }

    private List<DistributionResponse.Series> splitSeriesNumeric(
            Instances data, Attribute valueAttr, Attribute splitAttr, List<Double> edges) {
        if (splitAttr == null) return null;
        int binCount = Math.max(0, edges.size() - 1);
        List<DistributionResponse.Series> series = new ArrayList<>(splitAttr.numValues());
        for (int splitIndex = 0; splitIndex < splitAttr.numValues(); splitIndex++) {
            int[] counts = new int[binCount];
            List<Double> values = new ArrayList<>();
            for (int row = 0; row < data.numInstances(); row++) {
                Instance inst = data.instance(row);
                if (inst.isMissing(splitAttr) || inst.isMissing(valueAttr)
                        || (int) inst.value(splitAttr) != splitIndex) continue;
                double value = inst.value(valueAttr);
                values.add(value);
                if (binCount > 0) counts[histogramIndex(value, edges)]++;
            }
            series.add(DistributionResponse.Series.builder()
                    .label(splitAttr.value(splitIndex))
                    .counts(toList(counts))
                    .stats(summaryStats(values.stream().mapToDouble(Double::doubleValue).toArray()))
                    .build());
        }
        return series;
    }

    private List<DistributionResponse.Series> splitSeriesNominal(
            Instances data, Attribute valueAttr, Attribute splitAttr) {
        if (splitAttr == null) return null;
        List<DistributionResponse.Series> series = new ArrayList<>(splitAttr.numValues());
        for (int splitIndex = 0; splitIndex < splitAttr.numValues(); splitIndex++) {
            int[] counts = new int[valueAttr.numValues()];
            for (int row = 0; row < data.numInstances(); row++) {
                Instance inst = data.instance(row);
                if (inst.isMissing(splitAttr) || inst.isMissing(valueAttr)
                        || (int) inst.value(splitAttr) != splitIndex) continue;
                counts[(int) inst.value(valueAttr)]++;
            }
            series.add(DistributionResponse.Series.builder()
                    .label(splitAttr.value(splitIndex))
                    .counts(toList(counts))
                    .stats(null)
                    .build());
        }
        return series;
    }

    private static int histogramIndex(double value, List<Double> edges) {
        int bins = edges.size() - 1;
        double min = edges.get(0);
        double max = edges.get(edges.size() - 1);
        int index = (int) Math.floor((value - min) / Math.max(1e-12, max - min) * bins);
        if (index < 0) return 0;
        return Math.min(index, bins - 1);
    }

    private static List<Integer> toList(int[] counts) {
        List<Integer> out = new ArrayList<>(counts.length);
        for (int count : counts) out.add(count);
        return out;
    }

    private static DistributionResponse.SummaryStats summaryStats(double[] values) {
        double[] sorted = Arrays.stream(values).filter(v -> !Double.isNaN(v)).sorted().toArray();
        if (sorted.length == 0) {
            return DistributionResponse.SummaryStats.builder()
                    .count(0).mean(0).std(0).min(0).q1(0).median(0).q3(0).max(0)
                    .build();
        }
        double sum = Arrays.stream(sorted).sum();
        double mean = sum / sorted.length;
        double sumSquares = 0;
        for (double value : sorted) sumSquares += (value - mean) * (value - mean);
        double std = sorted.length < 2 ? 0 : Math.sqrt(sumSquares / (sorted.length - 1));
        return DistributionResponse.SummaryStats.builder()
                .count(sorted.length)
                .mean(round(mean, 4))
                .std(round(std, 4))
                .min(round(sorted[0], 4))
                .q1(round(percentile(sorted, 0.25), 4))
                .median(round(percentile(sorted, 0.50), 4))
                .q3(round(percentile(sorted, 0.75), 4))
                .max(round(sorted[sorted.length - 1], 4))
                .build();
    }

    private static double percentile(double[] sorted, double p) {
        double position = p * (sorted.length - 1);
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        if (lower == upper) return sorted[lower];
        return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
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
        boolean integerNumeric = INTEGER_CHURN_BY_DIMS.contains(dim);
        if (integerNumeric ? !dimAttr.isNumeric() : !dimAttr.isNominal()) {
            throw new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                    "dim '" + dim + "' has an unexpected attribute type");
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

        Map<String, int[]> agg = integerNumeric
                ? numericChurnGroups(data, dimAttr)
                : nominalChurnGroups(dimAttr);
        for (int i = 0; i < data.numInstances(); i++) {
            Instance inst = data.instance(i);
            if (inst.isMissing(dimAttr)) continue;
            String key = integerNumeric
                    ? integerGroupLabel(inst.value(dimAttr), dim)
                    : dimAttr.value((int) inst.value(dimAttr));
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

    private static Map<String, int[]> nominalChurnGroups(Attribute dimAttr) {
        Map<String, int[]> groups = new LinkedHashMap<>();
        for (int i = 0; i < dimAttr.numValues(); i++) {
            groups.put(dimAttr.value(i), new int[2]);
        }
        return groups;
    }

    private static Map<String, int[]> numericChurnGroups(Instances data, Attribute dimAttr) {
        Map<Long, int[]> sorted = new TreeMap<>();
        for (int i = 0; i < data.numInstances(); i++) {
            Instance inst = data.instance(i);
            if (inst.isMissing(dimAttr)) continue;
            long value = integerGroupValue(inst.value(dimAttr), dimAttr.name());
            sorted.computeIfAbsent(value, ignored -> new int[2]);
        }
        Map<String, int[]> groups = new LinkedHashMap<>();
        sorted.forEach((value, counts) -> groups.put(Long.toString(value), counts));
        return groups;
    }

    private static String integerGroupLabel(double value, String dim) {
        return Long.toString(integerGroupValue(value, dim));
    }

    private static long integerGroupValue(double value, String dim) {
        if (!Double.isFinite(value) || value != Math.rint(value)) {
            throw new BusinessException("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR,
                    "dim '" + dim + "' contains a non-integer value");
        }
        return (long) value;
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
