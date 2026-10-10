package com.creditminer.service;

import com.creditminer.dto.response.CorrelationResponse;
import com.creditminer.dto.response.DefaultGroupResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.dto.response.PcaPointResponse;
import com.creditminer.dto.response.PcaMetaResponse;
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

/** Read-only exploratory analysis over the cached UCI dataset. */
@Slf4j
@Service
@RequiredArgsConstructor
public class EdaService {
    private static final int DEFAULT_BINS = 20;
    private static final List<String> DEFAULT_BY_DIMS = List.of(
            "SEX", "EDUCATION", "MARRIAGE", "PAY_1", "PAY_2", "PAY_3",
            "PAY_4", "PAY_5", "PAY_6", "MONTHS_DELAYED", "RISK_TIER", "AGE");
    private static final Set<String> INTEGER_DIMS = Set.of(
            "PAY_1", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6", "MONTHS_DELAYED");

    private final EdaDataCache dataCache;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${creditminer.data.phase6-pca-json:data/processed/phase6_pca_2d.json}")
    private String pcaJsonPath;

    private volatile CorrelationResponse cachedCorrelation;
    private volatile List<PcaPointResponse> cachedPca;
    private volatile PcaMetaResponse cachedPcaMeta;

    public PcaMetaResponse pcaMeta() {
        PcaMetaResponse local = cachedPcaMeta;
        if (local != null) return local;
        synchronized (this) {
            if (cachedPcaMeta == null) cachedPcaMeta = computePcaMeta(pca2d());
            return cachedPcaMeta;
        }
    }

    /* Intent: describe only the exported projection, never imply original-space variance.
     * Status: cached with points. Next: original eigenvalues if exported in a future phase.
     * Blocker: original eigenvalues absent. Confidence: percentile and variance unit tests.
     */
    static PcaMetaResponse computePcaMeta(List<PcaPointResponse> points) {
        var builder = PcaMetaResponse.builder().pointCount(points.size())
                .explainedVarianceScope("Variance share of the two exported components, not of the original feature space");
        if (points.isEmpty()) return builder.explainedVariance(List.of(0.0, 0.0)).build();
        double[] x = points.stream().mapToDouble(PcaPointResponse::getX).sorted().toArray();
        double[] y = points.stream().mapToDouble(PcaPointResponse::getY).sorted().toArray();
        if (Arrays.stream(x).anyMatch(v -> !Double.isFinite(v))
                || Arrays.stream(y).anyMatch(v -> !Double.isFinite(v))) {
            throw unavailable("PCA artifact contains non-finite coordinates");
        }
        double mx = Arrays.stream(x).average().orElse(0);
        double my = Arrays.stream(y).average().orElse(0);
        double vx = Arrays.stream(x).map(v -> (v - mx) * (v - mx)).sum();
        double vy = Arrays.stream(y).map(v -> (v - my) * (v - my)).sum();
        double total = vx + vy;
        var bounds = PcaMetaResponse.ZoomBounds.builder()
                .xMin(percentile(x, .01)).xMax(percentile(x, .99))
                .yMin(percentile(y, .01)).yMax(percentile(y, .99)).build();
        long outside = points.stream().filter(p -> p.getX() < bounds.getXMin() || p.getX() > bounds.getXMax()
                || p.getY() < bounds.getYMin() || p.getY() > bounds.getYMax()).count();
        return builder.explainedVariance(total == 0 ? List.of(0.0, 0.0) : List.of(vx / total, vy / total))
                .zoomBounds(bounds).outsideCount(outside).build();
    }

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
        cachedPcaMeta = null;
    }

    private List<PcaPointResponse> loadPca() {
        File file = new File(pcaJsonPath);
        if (!file.exists()) {
            throw unavailable("PCA file missing at " + pcaJsonPath + ". Run Phase 6 first.");
        }
        try {
            JsonNode points = mapper.readTree(file).path("points");
            if (!points.isArray()) throw unavailable("PCA artifact has no points array");
            List<PcaPointResponse> result = new ArrayList<>(points.size());
            for (JsonNode point : points) {
                result.add(new PcaPointResponse(point.path("clientId").asLong(),
                        point.path("clusterId").asInt(), point.path("x").asDouble(),
                        point.path("y").asDouble()));
            }
            return result;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw unavailable("Failed to read PCA artifact: " + ex.getMessage());
        }
    }

    public DistributionResponse distribution(String column, Integer bins) {
        return distribution(column, bins, null);
    }

    public DistributionResponse distribution(String column, Integer bins, String split) {
        Instances data = dataCache.get();
        Attribute value = requireAttribute(data, column);
        Attribute splitAttribute = null;
        if (split != null) {
            if (!"Default".equals(split)) {
                throw invalid("split must be Default, got '" + split + "'");
            }
            splitAttribute = requireAttribute(data, split);
        }
        if (value.isNumeric()) {
            int binCount = Math.max(5, Math.min(50, bins == null ? DEFAULT_BINS : bins));
            return numericDistribution(data, value, splitAttribute, binCount);
        }
        if (value.isNominal()) return nominalDistribution(data, value, splitAttribute);
        throw invalid("Column '" + column + "' is neither numeric nor nominal");
    }

    private DistributionResponse numericDistribution(
            Instances data, Attribute value, Attribute split, int bins) {
        double[] values = data.attributeToDoubleArray(value.index());
        double[] present = Arrays.stream(values).filter(Double::isFinite).sorted().toArray();
        if (present.length == 0) {
            return DistributionResponse.builder().column(value.name()).type("numeric")
                    .binEdges(List.of()).counts(List.of()).stats(stats(present))
                    .series(splitNumeric(data, value, split, List.of())).build();
        }
        double min = present[0];
        double max = present[present.length - 1];
        List<Double> edges = new ArrayList<>();
        if (min == max) {
            edges.add(min);
            edges.add(min + 1e-9);
        } else {
            double step = (max - min) / bins;
            for (int i = 0; i <= bins; i++) edges.add(round(min + i * step, 6));
        }
        int[] counts = new int[edges.size() - 1];
        for (double item : present) counts[histogramIndex(item, edges)]++;
        return DistributionResponse.builder().column(value.name()).type("numeric")
                .binEdges(edges).counts(toList(counts)).stats(stats(present))
                .series(splitNumeric(data, value, split, edges)).build();
    }

    private DistributionResponse nominalDistribution(
            Instances data, Attribute value, Attribute split) {
        int[] counts = data.attributeStats(value.index()).nominalCounts;
        List<String> categories = new ArrayList<>();
        for (int i = 0; i < value.numValues(); i++) categories.add(value.value(i));
        return DistributionResponse.builder().column(value.name()).type("nominal")
                .categories(categories).counts(toList(counts)).stats(null)
                .series(splitNominal(data, value, split)).build();
    }

    private List<DistributionResponse.Series> splitNumeric(
            Instances data, Attribute value, Attribute split, List<Double> edges) {
        if (split == null) return null;
        List<DistributionResponse.Series> result = new ArrayList<>();
        for (int splitIndex = 0; splitIndex < split.numValues(); splitIndex++) {
            int[] counts = new int[Math.max(0, edges.size() - 1)];
            List<Double> selected = new ArrayList<>();
            for (Instance row : data) {
                if (row.isMissing(split) || row.isMissing(value)
                        || (int) row.value(split) != splitIndex) continue;
                double item = row.value(value);
                selected.add(item);
                if (counts.length > 0) counts[histogramIndex(item, edges)]++;
            }
            double[] selectedArray = selected.stream().mapToDouble(Double::doubleValue).toArray();
            result.add(DistributionResponse.Series.builder().label(split.value(splitIndex))
                    .counts(toList(counts)).stats(stats(selectedArray)).build());
        }
        return result;
    }

    private List<DistributionResponse.Series> splitNominal(
            Instances data, Attribute value, Attribute split) {
        if (split == null) return null;
        List<DistributionResponse.Series> result = new ArrayList<>();
        for (int splitIndex = 0; splitIndex < split.numValues(); splitIndex++) {
            int[] counts = new int[value.numValues()];
            for (Instance row : data) {
                if (!row.isMissing(split) && !row.isMissing(value)
                        && (int) row.value(split) == splitIndex) counts[(int) row.value(value)]++;
            }
            result.add(DistributionResponse.Series.builder().label(split.value(splitIndex))
                    .counts(toList(counts)).stats(null).build());
        }
        return result;
    }

    public CorrelationResponse correlation() {
        CorrelationResponse local = cachedCorrelation;
        if (local != null) return local;
        synchronized (this) {
            if (cachedCorrelation == null) cachedCorrelation = computeCorrelation();
            return cachedCorrelation;
        }
    }

    private CorrelationResponse computeCorrelation() {
        Instances data = dataCache.get();
        List<Attribute> attributes = new ArrayList<>();
        for (int i = 0; i < data.numAttributes(); i++) {
            Attribute attribute = data.attribute(i);
            if (attribute.isNumeric() && !"ID".equals(attribute.name())) attributes.add(attribute);
        }
        double[][] matrix = new double[attributes.size()][attributes.size()];
        for (int i = 0; i < attributes.size(); i++) {
            for (int j = i; j < attributes.size(); j++) {
                double value = i == j ? 1 : pearson(data, attributes.get(i), attributes.get(j));
                matrix[i][j] = value;
                matrix[j][i] = value;
            }
        }
        return CorrelationResponse.builder()
                .columns(attributes.stream().map(Attribute::name).toList()).matrix(matrix).build();
    }

    public List<DefaultGroupResponse> defaultBy(String dimension) {
        if (!DEFAULT_BY_DIMS.contains(dimension)) {
            throw invalid("dim must be one of " + DEFAULT_BY_DIMS + ", got '" + dimension + "'");
        }
        Instances data = dataCache.get();
        Attribute dim = requireAttribute(data, dimension);
        boolean age = "AGE".equals(dimension);
        boolean integer = INTEGER_DIMS.contains(dimension);
        if ((age || integer) ? !dim.isNumeric() : !dim.isNominal()) {
            throw invalid("dim '" + dimension + "' has an unexpected attribute type");
        }
        Attribute target = requireAttribute(data, "Default");
        int yes = target.indexOfValue("Yes");
        if (yes < 0) throw unavailable("Default class has no Yes level");
        Map<String, int[]> groups = age ? ageGroups()
                : integer ? numericGroups(data, dim) : nominalGroups(dim);
        for (Instance row : data) {
            if (row.isMissing(dim)) continue;
            String key = age ? ageBand(row.value(dim))
                    : integer ? Long.toString(integerValue(row.value(dim), dimension))
                    : dim.value((int) row.value(dim));
            int[] counts = groups.computeIfAbsent(key, ignored -> new int[2]);
            counts[0]++;
            if (!row.isMissing(target) && (int) row.value(target) == yes) counts[1]++;
        }
        List<DefaultGroupResponse> result = new ArrayList<>();
        groups.forEach((group, counts) -> result.add(DefaultGroupResponse.builder()
                .group(group).count(counts[0]).defaultCount(counts[1])
                .defaultRate(counts[0] == 0 ? 0 : round((double) counts[1] / counts[0], 4))
                .build()));
        return result;
    }

    private static Map<String, int[]> nominalGroups(Attribute dimension) {
        Map<String, int[]> result = new LinkedHashMap<>();
        for (int i = 0; i < dimension.numValues(); i++) result.put(dimension.value(i), new int[2]);
        return result;
    }

    private static Map<String, int[]> numericGroups(Instances data, Attribute dimension) {
        Map<Long, int[]> sorted = new TreeMap<>();
        for (Instance row : data) {
            if (!row.isMissing(dimension)) {
                sorted.computeIfAbsent(integerValue(row.value(dimension), dimension.name()), ignored -> new int[2]);
            }
        }
        Map<String, int[]> result = new LinkedHashMap<>();
        sorted.forEach((value, counts) -> result.put(Long.toString(value), counts));
        return result;
    }

    private static Map<String, int[]> ageGroups() {
        Map<String, int[]> result = new LinkedHashMap<>();
        for (String label : List.of("<30", "30-39", "40-49", "50-59", "60+")) {
            result.put(label, new int[2]);
        }
        return result;
    }

    private static String ageBand(double age) {
        if (age < 30) return "<30";
        if (age < 40) return "30-39";
        if (age < 50) return "40-49";
        if (age < 60) return "50-59";
        return "60+";
    }

    private static long integerValue(double value, String dimension) {
        if (!Double.isFinite(value) || value != Math.rint(value)) {
            throw new BusinessException("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR,
                    "dim '" + dimension + "' contains a non-integer value");
        }
        return (long) value;
    }

    private static double pearson(Instances data, Attribute left, Attribute right) {
        double sumLeft = 0, sumRight = 0;
        int count = 0;
        for (Instance row : data) {
            if (row.isMissing(left) || row.isMissing(right)) continue;
            sumLeft += row.value(left);
            sumRight += row.value(right);
            count++;
        }
        if (count < 2) return 0;
        double meanLeft = sumLeft / count;
        double meanRight = sumRight / count;
        double covariance = 0, leftSquares = 0, rightSquares = 0;
        for (Instance row : data) {
            if (row.isMissing(left) || row.isMissing(right)) continue;
            double x = row.value(left) - meanLeft;
            double y = row.value(right) - meanRight;
            covariance += x * y;
            leftSquares += x * x;
            rightSquares += y * y;
        }
        double denominator = Math.sqrt(leftSquares * rightSquares);
        return denominator == 0 ? 0 : round(covariance / denominator, 4);
    }

    private static DistributionResponse.SummaryStats stats(double[] values) {
        double[] sorted = Arrays.stream(values).filter(Double::isFinite).sorted().toArray();
        if (sorted.length == 0) {
            return DistributionResponse.SummaryStats.builder().count(0).mean(0).std(0)
                    .min(0).q1(0).median(0).q3(0).max(0).build();
        }
        double mean = Arrays.stream(sorted).average().orElse(0);
        double squares = Arrays.stream(sorted).map(v -> (v - mean) * (v - mean)).sum();
        double std = sorted.length < 2 ? 0 : Math.sqrt(squares / (sorted.length - 1));
        return DistributionResponse.SummaryStats.builder().count(sorted.length)
                .mean(round(mean, 4)).std(round(std, 4)).min(sorted[0])
                .q1(round(percentile(sorted, .25), 4)).median(round(percentile(sorted, .5), 4))
                .q3(round(percentile(sorted, .75), 4)).max(sorted[sorted.length - 1]).build();
    }

    private static double percentile(double[] sorted, double percentile) {
        double position = percentile * (sorted.length - 1);
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        return lower == upper ? sorted[lower]
                : sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
    }

    private static int histogramIndex(double value, List<Double> edges) {
        int bins = edges.size() - 1;
        int index = (int) Math.floor((value - edges.get(0))
                / Math.max(1e-12, edges.get(edges.size() - 1) - edges.get(0)) * bins);
        return Math.max(0, Math.min(index, bins - 1));
    }

    private static List<Integer> toList(int[] values) {
        List<Integer> result = new ArrayList<>(values.length);
        for (int value : values) result.add(value);
        return result;
    }

    private static Attribute requireAttribute(Instances data, String name) {
        Attribute attribute = data.attribute(name);
        if (attribute == null) throw invalid("Unknown column '" + name + "'");
        return attribute;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST, message);
    }

    private static BusinessException unavailable(String message) {
        return new BusinessException("REPORT_NOT_GENERATED", HttpStatus.SERVICE_UNAVAILABLE, message);
    }

    private static double round(double value, int decimals) {
        if (!Double.isFinite(value)) return 0;
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
