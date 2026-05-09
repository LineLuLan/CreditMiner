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
 * Phase 6 — KMeans clustering + offline interpretation helpers.
 * Online {@link #assign(Instance)} reads the loaded clusterer from {@link ModelConfig}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClusteringService {

    private static final int DEFAULT_MAX_ITERATIONS = 500;
    private static final long DEFAULT_SEED = 42L;
    /** Cap silhouette pairwise computation for performance (n²). */
    private static final int SILHOUETTE_SAMPLE = 1000;

    private final ModelConfig modelConfig;

    /** Train final SimpleKMeans (Euclidean, seed 42, 500 iterations). */
    public SimpleKMeans train(Instances data, int k) throws Exception {
        SimpleKMeans km = new SimpleKMeans();
        km.setNumClusters(k);
        km.setSeed((int) DEFAULT_SEED);
        km.setMaxIterations(DEFAULT_MAX_ITERATIONS);
        km.setPreserveInstancesOrder(true);
        km.setDistanceFunction(new EuclideanDistance());
        km.buildClusterer(data);
        return km;
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
            log.info("k={} → WCSS={}, silhouette={}", k, round(wcss[i]), round(silhouette[i]));
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
     * Predict-time cluster assignment from a full enriched instance (26 attrs).
     *
     * <p>The clusterer was trained on a 19-attr subset (numeric only, after dropping
     * CLIENTNUM + Attrition_Flag + 7 nominals) that was min-max normalized. To assign
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

    /**
     * Build per-cluster summaries: size, original-unit centroid, avgRisk,
     * churnRate, description. Centroids are computed from the ORIGINAL
     * (un-normalized) {@code originalData} keyed by the same row order as
     * {@code assignments} to preserve interpretability.
     */
    public List<ClusterResponse> summarize(Instances originalData, int[] assignments, int k) {
        List<List<Integer>> rowsPerCluster = new ArrayList<>();
        for (int i = 0; i < k; i++) rowsPerCluster.add(new ArrayList<>());
        for (int i = 0; i < assignments.length; i++) rowsPerCluster.get(assignments[i]).add(i);

        Attribute risk = originalData.attribute("Risk_Score");
        Attribute attr = originalData.attribute("Attrition_Flag");
        int attritedIdx = attr == null ? -1 : attr.indexOfValue("Attrited Customer");

        List<ClusterResponse> out = new ArrayList<>(k);
        for (int c = 0; c < k; c++) {
            List<Integer> rows = rowsPerCluster.get(c);
            Map<String, Double> centroid = new LinkedHashMap<>();
            for (int j = 0; j < originalData.numAttributes(); j++) {
                Attribute a = originalData.attribute(j);
                if (!a.isNumeric()) continue;
                if ("CLIENTNUM".equals(a.name())) continue;
                double sum = 0; int cnt = 0;
                for (int row : rows) {
                    double v = originalData.instance(row).value(j);
                    if (!Double.isNaN(v)) { sum += v; cnt++; }
                }
                centroid.put(a.name(), cnt == 0 ? 0.0 : round(sum / cnt));
            }

            double avgRisk = 0;
            if (risk != null) {
                double s = 0; int n = 0;
                for (int row : rows) {
                    double v = originalData.instance(row).value(risk);
                    if (!Double.isNaN(v)) { s += v; n++; }
                }
                avgRisk = n == 0 ? 0 : round(s / n);
            }
            double churnRate = 0;
            if (attr != null && attritedIdx >= 0) {
                int churned = 0;
                for (int row : rows) {
                    Instance inst = originalData.instance(row);
                    if (!inst.isMissing(attr) && (int) inst.value(attr) == attritedIdx) churned++;
                }
                churnRate = rows.isEmpty() ? 0 : round((double) churned / rows.size());
            }

            out.add(ClusterResponse.builder()
                    .clusterId(c)
                    .personaName("Cluster " + c)  // manual rename in seeder
                    .size(rows.size())
                    .centroid(centroid)
                    .avgRisk(avgRisk)
                    .churnRate(churnRate)
                    .description(describeCluster(centroid, avgRisk, churnRate))
                    .build());
        }
        return out;
    }

    /** Heuristic auto-description used until the analyst writes proper personas. */
    private static String describeCluster(Map<String, Double> centroid, double avgRisk, double churnRate) {
        Double util = centroid.get("Avg_Utilization_Ratio");
        Double trans = centroid.get("Total_Trans_Amt");
        Double credit = centroid.get("Credit_Limit");
        StringBuilder sb = new StringBuilder();
        if (credit != null) sb.append(credit > 12000 ? "high credit" : credit > 6000 ? "mid credit" : "low credit");
        if (util != null) sb.append(util > 0.5 ? ", high utilization" : util > 0.2 ? ", mid utilization" : ", low utilization");
        if (trans != null) sb.append(trans > 8000 ? ", heavy spender" : trans > 3000 ? ", mid spender" : ", light spender");
        sb.append(String.format(", avgRisk=%.2f, churn=%.2f", avgRisk, churnRate));
        return sb.toString();
    }

    /**
     * Sampled silhouette: pick {@code sampleSize} random points; compute
     * each one's silhouette using ALL points as reference. O(sampleSize × n).
     */
    private static double sampledSilhouette(Instances data, int[] assignments, int k, int sampleSize) {
        if (data.numInstances() < 2 || k < 2) return 0.0;
        int n = data.numInstances();
        int sample = Math.min(sampleSize, n);
        Random rng = new Random(DEFAULT_SEED);
        int[] sampleIdx = new int[sample];
        for (int i = 0; i < sample; i++) sampleIdx[i] = rng.nextInt(n);

        double total = 0;
        int counted = 0;
        for (int idx : sampleIdx) {
            int own = assignments[idx];
            double[] dSum = new double[k];
            int[] dCount = new int[k];
            for (int j = 0; j < n; j++) {
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
