package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.response.ClusterResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.clusterers.SimpleKMeans;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.EuclideanDistance;
import weka.core.Instance;
import weka.core.Instances;
import weka.core.Utils;
import weka.filters.Filter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Phase 6 - KMeans clustering + offline interpretation helpers.
 * Online {@link #assign(Instance)} reads the loaded clusterer from {@link ModelConfig}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClusteringService {

    public static final List<String> CLUSTER_FEATURES = List.of(
            "UTILIZATION_1", "AVG_UTILIZATION", "PAY_RATIO", "MONTHS_DELAYED",
            "MAX_DELAY", "BILL_TREND", "LIMIT_BAL", "AGE");

    private static final int DEFAULT_MAX_ITERATIONS = 500;
    private static final long DEFAULT_SEED = 42L;
    public static final List<Integer> RESTART_SEEDS = List.of(42, 1, 2, 3, 4, 5, 6, 7, 8, 9);
    /** Cap both sides of silhouette pairwise computation for predictable runtime. */
    private static final int SILHOUETTE_SAMPLE = 1000;

    private final ModelConfig modelConfig;

    /** Train final SimpleKMeans (Euclidean, seed 42, 500 iterations). */
    public SimpleKMeans train(Instances data, int k) throws Exception {
        return train(data, k, false);
    }

    public SimpleKMeans train(Instances data, int k, boolean plusPlus) throws Exception {
        return train(data, k, plusPlus, (int) DEFAULT_SEED);
    }

    SimpleKMeans train(Instances data, int k, boolean plusPlus, int seed) throws Exception {
        SimpleKMeans km = new SimpleKMeans();
        if (plusPlus) km.setInitializationMethod(new weka.core.SelectedTag(
                SimpleKMeans.KMEANS_PLUS_PLUS, SimpleKMeans.TAGS_SELECTION));
        km.setNumClusters(k);
        km.setSeed(seed);
        km.setMaxIterations(DEFAULT_MAX_ITERATIONS);
        km.setPreserveInstancesOrder(true);
        km.setDistanceFunction(new EuclideanDistance());
        km.buildClusterer(data);
        return km;
    }

    /**
     * Intent: compare deterministic local optima without selecting by persona labels.
     * Status: ten k-means++ runs; first seed wins exact WCSS ties. Next: inspect final evidence.
     * Blockers: none. Confidence: minimum-WCSS and determinism regression tests.
     */
    public SimpleKMeans trainBest(Instances data, int k) throws Exception {
        SimpleKMeans best = null;
        for (int seed : RESTART_SEEDS) {
            SimpleKMeans candidate = train(data, k, true, seed);
            log.info("Restart k={}, seed={}, WCSS={}", k, seed, candidate.getSquaredError());
            if (best == null || candidate.getSquaredError() < best.getSquaredError()) best = candidate;
        }
        return best;
    }

    public double silhouette(Instances data, SimpleKMeans model) throws Exception {
        return sampledSilhouette(data, model.getAssignments(), model.numberOfClusters(), SILHOUETTE_SAMPLE);
    }

    /**
     * Sweep {@code k = kMin..kMax} (inclusive). For each k records WCSS
     * (Weka's squaredError) and a sampled silhouette score.
     */
    public ElbowResult elbow(Instances data, int kMin, int kMax) throws Exception {
        int n = kMax - kMin + 1;
        double[] wcss = new double[n];
        double[] silhouette = new double[n];
        for (int i = 0; i < n; i++) {
            int k = kMin + i;
            SimpleKMeans km = train(data, k);
            wcss[i] = km.getSquaredError();
            int[] assignments = km.getAssignments();
            silhouette[i] = sampledSilhouette(data, assignments, k, SILHOUETTE_SAMPLE);
            log.info("k={} -> WCSS={}, silhouette={}", k, round(wcss[i]), round(silhouette[i]));
        }
        return new ElbowResult(kMin, kMax, wcss, silhouette);
    }

    /** Pick best k by argmax of silhouette in the swept range. */
    public int bestK(ElbowResult r) {
        int best = 0;
        for (int i = 1; i < r.silhouette.length; i++) {
            if (r.silhouette[i] > r.silhouette[best]) best = i;
        }
        return r.kMin + best;
    }

    /** Assign cluster ID to a single instance using the loaded clusterer. */
    public int assign(Instance inst) throws Exception {
        if (modelConfig.getClusterer() == null) return -1;
        return modelConfig.getClusterer().clusterInstance(inst);
    }

    /**
     * Predict-time cluster assignment from a full enriched instance.
     *
     * <p>The clusterer was trained on the explicit credit-behaviour feature set and
     * min-max normalized. To assign
     * a new point we must reproduce that pipeline:</p>
     * <ol>
     *   <li>Build a fresh 19-attr {@link Instance} matching the saved input header,
     *       copying values from {@code enriched} by attribute name.</li>
     *   <li>Push it through the persisted Normalize filter (so min/max bounds match
     *       training).</li>
     *   <li>Hand the normalized instance to the clusterer.</li>
     * </ol>
     *
     * @return cluster id (0..k-1), or -1 if the normalizer/header/clusterer is missing
     *     or any required attribute is absent from {@code enriched}.
     */
    public int assignFromEnriched(Instance enriched) throws Exception {
        if (modelConfig.getClusterer() == null
                || modelConfig.getClustererNormalizer() == null
                || modelConfig.getClustererInputHeader() == null
                || enriched.dataset() == null) {
            return -1;
        }

        Instances headerTemplate = modelConfig.getClustererInputHeader();
        Instances srcDataset = enriched.dataset();

        Instances buf = new Instances(headerTemplate, 0);
        double[] vals = new double[buf.numAttributes()];
        for (int i = 0; i < buf.numAttributes(); i++) {
            Attribute target = buf.attribute(i);
            Attribute src = srcDataset.attribute(target.name());
            if (src == null) {
                log.warn("Predict-time enriched instance is missing required cluster feature '{}'", target.name());
                vals[i] = Utils.missingValue();
            } else {
                vals[i] = enriched.value(src);
            }
        }
        DenseInstance row = new DenseInstance(1.0, vals);
        buf.add(row);
        Instance attached = buf.instance(0);

        Filter normalizer = modelConfig.getClustererNormalizer();
        normalizer.input(attached);
        normalizer.batchFinished();
        Instance normalized = normalizer.output();
        if (normalized == null) {
            log.warn("Normalizer produced no output for predict-time row");
            return -1;
        }
        return modelConfig.getClusterer().clusterInstance(normalized);
    }

    /** Build interpretable cluster summaries from original-unit feature values. */
    public List<ClusterResponse> summarize(Instances originalData, int[] assignments, int k) {
        List<List<Integer>> rowsPerCluster = new ArrayList<>();
        for (int i = 0; i < k; i++) rowsPerCluster.add(new ArrayList<>());
        for (int i = 0; i < assignments.length; i++) rowsPerCluster.get(assignments[i]).add(i);

        Attribute risk = originalData.attribute("RISK_TIER");
        Attribute target = originalData.attribute("Default");
        int yesIndex = target == null ? -1 : target.indexOfValue("Yes");

        List<ClusterResponse> out = new ArrayList<>(k);
        for (int c = 0; c < k; c++) {
            List<Integer> rows = rowsPerCluster.get(c);
            Map<String, Double> centroid = new LinkedHashMap<>();
            for (String feature : CLUSTER_FEATURES) {
                Attribute a = originalData.attribute(feature);
                if (a == null || !a.isNumeric()) {
                    throw new IllegalArgumentException("Missing numeric cluster feature: " + feature);
                }
                double sum = 0; int cnt = 0;
                for (int row : rows) {
                    double v = originalData.instance(row).value(a);
                    if (!Double.isNaN(v)) { sum += v; cnt++; }
                }
                centroid.put(a.name(), cnt == 0 ? 0.0 : round(sum / cnt));
            }

            double avgRisk = 0;
            if (risk != null) {
                double s = 0; int n = 0;
                for (int row : rows) {
                    Instance instance = originalData.instance(row);
                    if (!instance.isMissing(risk)) {
                        String tier = instance.stringValue(risk);
                        s += "High".equals(tier) ? 1.0 : "Medium".equals(tier) ? 0.5 : 0.0;
                        n++;
                    }
                }
                avgRisk = n == 0 ? 0 : round(s / n);
            }
            double defaultRate = 0;
            if (target != null && yesIndex >= 0) {
                int defaults = 0;
                for (int row : rows) {
                    Instance inst = originalData.instance(row);
                    if (!inst.isMissing(target) && (int) inst.value(target) == yesIndex) defaults++;
                }
                defaultRate = rows.isEmpty() ? 0 : round((double) defaults / rows.size());
            }

            out.add(ClusterResponse.builder()
                    .clusterId(c)
                    .personaName(personaName(centroid, defaultRate))
                    .generatedAt(java.time.Instant.now().toString())
                    .size(rows.size())
                    .centroid(centroid)
                    .avgRisk(avgRisk)
                    .defaultRate(defaultRate)
                    .description(describeCluster(centroid, avgRisk, defaultRate))
                    .build());
        }
        PersonaNaming.apply(out);
        for (ClusterResponse cluster : out) {
            cluster.setPersonaName(cluster.getDisplayName());
            cluster.setDescription(cluster.getPersonaName() + ": " + cluster.getTagline()
                    + ". " + cluster.getDescription());
        }
        return out;
    }

    private static String personaName(Map<String, Double> centroid, double defaultRate) {
        return PersonaNaming.name(centroid);
    }

    /** Description is derived from the cluster's observed centroids and target rate. */
    private static String describeCluster(
            Map<String, Double> centroid, double avgRisk, double defaultRate) {
        return String.format(
                "avg utilization %.2f, pay ratio %.2f, %.2f months delayed, max delay %.2f, "
                        + "limit %.0f, average ordinal risk %.2f, default rate %.2f",
                centroid.getOrDefault("AVG_UTILIZATION", 0.0),
                centroid.getOrDefault("PAY_RATIO", 0.0),
                centroid.getOrDefault("MONTHS_DELAYED", 0.0),
                centroid.getOrDefault("MAX_DELAY", 0.0),
                centroid.getOrDefault("LIMIT_BAL", 0.0),
                avgRisk,
                defaultRate);
    }

    /**
     * Sampled silhouette: choose rows without replacement and compare within that
     * representative subset. This bounds each candidate at O(sampleSize squared).
     */
    private static double sampledSilhouette(Instances data, int[] assignments, int k, int sampleSize) {
        if (data.numInstances() < 2 || k < 2) return 0.0;
        int n = data.numInstances();
        int sample = Math.min(sampleSize, n);
        Random rng = new Random(DEFAULT_SEED);
        int[] population = new int[n];
        for (int i = 0; i < n; i++) population[i] = i;
        for (int i = 0; i < sample; i++) {
            int swap = i + rng.nextInt(n - i);
            int selected = population[swap];
            population[swap] = population[i];
            population[i] = selected;
        }

        double total = 0;
        int counted = 0;
        for (int samplePosition = 0; samplePosition < sample; samplePosition++) {
            int idx = population[samplePosition];
            int own = assignments[idx];
            double[] dSum = new double[k];
            int[] dCount = new int[k];
            for (int referencePosition = 0; referencePosition < sample; referencePosition++) {
                int j = population[referencePosition];
                if (j == idx) continue;
                double dist = euclidean(data.instance(idx), data.instance(j));
                dSum[assignments[j]] += dist;
                dCount[assignments[j]]++;
            }
            double a = dCount[own] == 0 ? 0 : dSum[own] / dCount[own];
            double b = Double.POSITIVE_INFINITY;
            for (int c = 0; c < k; c++) {
                if (c == own || dCount[c] == 0) continue;
                double mean = dSum[c] / dCount[c];
                if (mean < b) b = mean;
            }
            if (b == Double.POSITIVE_INFINITY) continue;
            double s = (b - a) / Math.max(a, b);
            if (Double.isNaN(s)) continue;
            total += s;
            counted++;
        }
        return counted == 0 ? 0 : total / counted;
    }

    private static double euclidean(Instance a, Instance b) {
        double s = 0;
        for (int i = 0; i < a.numAttributes(); i++) {
            double da = a.value(i) - b.value(i);
            s += da * da;
        }
        return Math.sqrt(s);
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }

    public record ElbowResult(int kMin, int kMax, double[] wcss, double[] silhouette) { }
}
