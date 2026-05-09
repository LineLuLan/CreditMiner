package com.creditminer.pipeline;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.service.ClusteringService;
import com.creditminer.service.ClusteringService.ElbowResult;
import com.creditminer.service.DataLoader;
import com.creditminer.service.Preprocessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import weka.clusterers.SimpleKMeans;
import weka.core.Attribute;
import weka.core.Instances;
import weka.core.SerializationHelper;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.PrincipalComponents;
import weka.filters.unsupervised.attribute.Remove;

import java.io.File;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * OFFLINE Phase 6 — Clustering & Anomaly (BE-60..BE-65) + PCA-2D (BE-43).
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase6Pipeline"
 * }</pre>
 * </p>
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Load enriched.arff (Phase 3 output, 27 cols)</li>
 *   <li>Drop {@code Attrition_Flag}, {@code CLIENTNUM} + all nominals → numeric-only matrix</li>
 *   <li>Min-max normalize (KMeans needs scaled features)</li>
 *   <li>Sweep k=2..8, record WCSS + sampled silhouette → pick best k by silhouette</li>
 *   <li>Train final {@link SimpleKMeans} (seed 42, 500 iter), save {@code models/kmeans.model}</li>
 *   <li>Compute centroid distance per row → flag anomaly when {@code distance > μ+3σ}</li>
 *   <li>Combine with {@code phase2_outliers.json} → {@code phase6_anomalies.json}</li>
 *   <li>Apply {@link PrincipalComponents} on the same normalized matrix; export first 2 PCs
 *       per CLIENTNUM to {@code phase6_pca_2d.json} (BE-43)</li>
 *   <li>Persist per-cluster summaries (centroid in original units, avgRisk, churnRate) to
 *       {@code phase6_clusters.json}</li>
 * </ol>
 * </p>
 */
@Slf4j
public class Phase6Pipeline {

    private static final String DEFAULT_INPUT = "data/processed/enriched.arff";
    private static final String DEFAULT_PHASE2_OUTLIERS = "data/processed/phase2_outliers.json";
    private static final String MODEL_PATH = "models/kmeans.model";
    private static final String CLUSTERS_JSON = "data/processed/phase6_clusters.json";
    private static final String ANOMALIES_JSON = "data/processed/phase6_anomalies.json";
    private static final String PCA_JSON = "data/processed/phase6_pca_2d.json";
    private static final String ELBOW_JSON = "data/processed/phase6_elbow.json";

    private static final int K_MIN = 2;
    private static final int K_MAX = 8;

    /** Nominal columns dropped before clustering (KMeans requires numeric). */
    private static final List<String> NOMINAL_DROP = List.of(
            "Attrition_Flag", "Gender", "Education_Level", "Marital_Status",
            "Income_Category", "Card_Category", "Customer_Tier"
    );

    public static void main(String[] args) throws Exception {
        String inputArff = args.length > 0 ? args[0] : DEFAULT_INPUT;
        String phase2Outliers = args.length > 1 ? args[1] : DEFAULT_PHASE2_OUTLIERS;

        log.info("=== Phase 6 — Clustering & Anomaly + PCA-2D ===");

        DataLoader loader = new DataLoader();
        Instances raw = loader.loadArff(inputArff);
        Attribute classAttr = raw.attribute("Attrition_Flag");
        if (classAttr != null) raw.setClassIndex(classAttr.index());
        log.info("Loaded {} rows × {} cols", raw.numInstances(), raw.numAttributes());

        // Build clustering input: drop nominals + CLIENTNUM, then min-max normalize.
        Instances clusterIn = removeAttributes(raw, "CLIENTNUM");
        clusterIn = removeAttributesByName(clusterIn, NOMINAL_DROP);
        clusterIn.setClassIndex(-1);
        Preprocessor pre = new Preprocessor();
        Instances normalized = pre.normalize(clusterIn);
        log.info("Clustering matrix: {} rows × {} numeric features", normalized.numInstances(), normalized.numAttributes());

        ClusteringService cs = new ClusteringService(null);

        // Elbow + silhouette sweep
        ElbowResult elbow = cs.elbow(normalized, K_MIN, K_MAX);
        int bestK = cs.bestK(elbow);
        log.info("Best k by silhouette: {}", bestK);

        // Final model
        SimpleKMeans finalModel = cs.train(normalized, bestK);
        new File(MODEL_PATH).getParentFile().mkdirs();
        SerializationHelper.write(MODEL_PATH, finalModel);
        log.info("Saved {}", MODEL_PATH);

        int[] assignments = finalModel.getAssignments();

        // Centroid distances + tiered thresholds.
        // Blueprint §3 targets ~3-5% anomalies. Old strict rule
        // (μ+3σ AND phase2_outlier) hit only 0.46%, so we widen with two thresholds:
        //   strongCluster = distance > μ+2σ  → qualifies as anomaly alone
        //   mildCluster   = distance > μ+1σ  → must be confirmed by phase2 (Z OR IQR) signal
        Instances centroids = finalModel.getClusterCentroids();
        double[] distances = new double[normalized.numInstances()];
        for (int i = 0; i < normalized.numInstances(); i++) {
            distances[i] = euclidean(normalized.instance(i), centroids.instance(assignments[i]));
        }
        double mu = mean(distances);
        double sd = std(distances, mu);
        double strongThreshold = mu + 2 * sd;
        double mildThreshold = mu + 1 * sd;
        boolean[] strongCluster = new boolean[distances.length];
        boolean[] mildCluster = new boolean[distances.length];
        int strongCount = 0, mildCount = 0;
        for (int i = 0; i < distances.length; i++) {
            if (distances[i] > strongThreshold) { strongCluster[i] = true; strongCount++; }
            if (distances[i] > mildThreshold)   { mildCluster[i]   = true; mildCount++; }
        }
        log.info("Centroid distance: μ={}, σ={}; strong>μ+2σ={} (count {}); mild>μ+1σ={} (count {})",
                round(mu), round(sd), round(strongThreshold), strongCount,
                round(mildThreshold), mildCount);

        // Phase 2 outlier set
        Set<Long> phase2OutlierSet = readPhase2OutlierSet(phase2Outliers);

        // Per-cluster summary (original units)
        List<ClusterResponse> summaries = cs.summarize(raw, assignments, bestK);

        // PCA-2D (BE-43)
        List<double[]> pcaCoords = computePca2d(normalized);

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        // Outputs
        writeJson(mapper, ELBOW_JSON, buildElbowDoc(elbow, bestK));
        writeJson(mapper, CLUSTERS_JSON, summaries);
        writeJson(mapper, ANOMALIES_JSON,
                buildAnomaliesDoc(raw, assignments, distances,
                        strongCluster, mildCluster, phase2OutlierSet,
                        round(mu), round(sd), round(strongThreshold), round(mildThreshold)));
        writeJson(mapper, PCA_JSON, buildPcaDoc(raw, assignments, pcaCoords));

        printConsoleSummary(elbow, bestK, summaries, strongCount, mildCount, phase2OutlierSet.size());
        log.info("=== Phase 6 DONE ===");
    }

    // -------------------- helpers: data prep --------------------

    private static Instances removeAttributes(Instances data, String... names) throws Exception {
        return removeAttributesByName(data, List.of(names));
    }

    private static Instances removeAttributesByName(Instances data, List<String> names) throws Exception {
        List<Integer> indices = new ArrayList<>();
        for (String n : names) {
            Attribute a = data.attribute(n);
            if (a != null) indices.add(a.index());
        }
        if (indices.isEmpty()) return data;
        Remove rm = new Remove();
        rm.setAttributeIndicesArray(indices.stream().mapToInt(Integer::intValue).toArray());
        rm.setInputFormat(data);
        return Filter.useFilter(data, rm);
    }

    private static List<double[]> computePca2d(Instances normalized) throws Exception {
        PrincipalComponents pca = new PrincipalComponents();
        pca.setMaximumAttributes(2);
        pca.setVarianceCovered(1.0);
        pca.setInputFormat(normalized);
        Instances projected = Filter.useFilter(normalized, pca);
        int rows = projected.numInstances();
        int cols = projected.numAttributes();
        log.info("PCA projected: {} rows × {} components", rows, cols);
        List<double[]> out = new ArrayList<>(rows);
        for (int i = 0; i < rows; i++) {
            double x = cols >= 1 ? projected.instance(i).value(0) : 0.0;
            double y = cols >= 2 ? projected.instance(i).value(1) : 0.0;
            out.add(new double[] { round(x), round(y) });
        }
        return out;
    }

    // -------------------- helpers: math --------------------

    private static double euclidean(weka.core.Instance a, weka.core.Instance b) {
        double s = 0;
        for (int i = 0; i < a.numAttributes(); i++) {
            double d = a.value(i) - b.value(i);
            s += d * d;
        }
        return Math.sqrt(s);
    }

    private static double mean(double[] xs) {
        double s = 0; int n = 0;
        for (double x : xs) if (!Double.isNaN(x)) { s += x; n++; }
        return n == 0 ? 0 : s / n;
    }

    private static double std(double[] xs, double mean) {
        double ss = 0; int n = 0;
        for (double x : xs) if (!Double.isNaN(x)) { ss += (x - mean) * (x - mean); n++; }
        return n < 2 ? 0 : Math.sqrt(ss / (n - 1));
    }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }

    // -------------------- helpers: output JSONs --------------------

    @SuppressWarnings("unchecked")
    private static Set<Long> readPhase2OutlierSet(String path) {
        File f = new File(path);
        if (!f.exists()) {
            log.warn("Phase 2 outliers file not found at {} — combined anomaly = cluster-distance only", path);
            return Set.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> doc = mapper.readValue(f, Map.class);
            List<Number> list = (List<Number>) doc.get("outlierClientNums");
            Set<Long> out = new HashSet<>();
            if (list != null) for (Number n : list) out.add(n.longValue());
            return out;
        } catch (Exception e) {
            log.warn("Failed to read {}: {}", path, e.getMessage());
            return Set.of();
        }
    }

    private static Map<String, Object> buildElbowDoc(ElbowResult e, int bestK) {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("kMin", e.kMin());
        doc.put("kMax", e.kMax());
        doc.put("bestK", bestK);
        doc.put("strategy", "argmax silhouette");
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < e.wcss().length; i++) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("k", e.kMin() + i);
            r.put("wcss", round(e.wcss()[i]));
            r.put("silhouette", round(e.silhouette()[i]));
            rows.add(r);
        }
        doc.put("scores", rows);
        return doc;
    }

    private static Map<String, Object> buildAnomaliesDoc(
            Instances raw, int[] assignments, double[] distances,
            boolean[] strongCluster, boolean[] mildCluster, Set<Long> phase2OutlierSet,
            double mu, double sd, double strongThreshold, double mildThreshold) {

        Attribute clientNumAttr = raw.attribute("CLIENTNUM");
        List<Map<String, Object>> records = new ArrayList<>();
        int combinedCount = 0;
        for (int i = 0; i < raw.numInstances(); i++) {
            long clientNum = clientNumAttr == null ? 0L : (long) raw.instance(i).value(clientNumAttr);
            boolean p2 = phase2OutlierSet.contains(clientNum);
            boolean strong = strongCluster[i];
            boolean mild = mildCluster[i];
            if (!p2 && !mild && !strong) continue; // include row if any anomaly signal fired
            // Blueprint §6.5: combine cluster distance with Phase-2 (Z OR IQR) signals.
            // Rule: anomaly when STRONG cluster outlier (cd>μ+2σ) is also confirmed
            // by univariate extremity from Phase 2. Targets ~3-5% per blueprint §3.
            boolean isAnomaly = strong && p2;
            if (isAnomaly) combinedCount++;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("clientNum", clientNum);
            r.put("clusterId", assignments[i]);
            r.put("centroidDistance", round(distances[i]));
            r.put("phase2Outlier", p2);
            r.put("clusterMildOutlier", mild);
            r.put("clusterStrongOutlier", strong);
            r.put("isAnomaly", isAnomaly);
            records.add(r);
        }
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("totalRows", raw.numInstances());
        doc.put("phase2OutlierCount", phase2OutlierSet.size());
        doc.put("clusterStrongOutlierCount", countTrue(strongCluster));
        doc.put("clusterMildOutlierCount", countTrue(mildCluster));
        doc.put("combinedAnomalyCount", combinedCount);
        doc.put("combinedAnomalyPct", raw.numInstances() == 0
                ? 0.0 : round((double) combinedCount / raw.numInstances()));
        doc.put("clusterDistanceMu", mu);
        doc.put("clusterDistanceSigma", sd);
        doc.put("strongThreshold", strongThreshold);
        doc.put("mildThreshold", mildThreshold);
        doc.put("rule", "isAnomaly = clusterStrongOutlier (cd>μ+2σ) AND phase2Outlier (Z>3 OR IQR fence). Targets blueprint §3 ~3-5%.");
        doc.put("records", records);
        doc.put("generatedAt", Instant.now().toString());
        return doc;
    }

    private static Map<String, Object> buildPcaDoc(
            Instances raw, int[] assignments, List<double[]> coords) {

        Attribute clientNumAttr = raw.attribute("CLIENTNUM");
        List<Map<String, Object>> rows = new ArrayList<>(coords.size());
        for (int i = 0; i < coords.size(); i++) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("clientNum", clientNumAttr == null ? 0L : (long) raw.instance(i).value(clientNumAttr));
            r.put("clusterId", assignments[i]);
            r.put("x", coords.get(i)[0]);
            r.put("y", coords.get(i)[1]);
            rows.add(r);
        }
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("totalRows", coords.size());
        doc.put("componentCount", 2);
        doc.put("source", "min-max normalized numeric features minus CLIENTNUM/Attrition_Flag/all nominals");
        doc.put("points", rows);
        doc.put("generatedAt", Instant.now().toString());
        return doc;
    }

    private static int countTrue(boolean[] xs) {
        int n = 0;
        for (boolean b : xs) if (b) n++;
        return n;
    }

    private static void writeJson(ObjectMapper mapper, String path, Object doc) throws java.io.IOException {
        File f = new File(path);
        if (f.getParentFile() != null) f.getParentFile().mkdirs();
        mapper.writeValue(f, doc);
        log.info("Wrote {}", path);
    }

    private static void printConsoleSummary(ElbowResult e, int bestK,
                                            List<ClusterResponse> summaries,
                                            int strongCount, int mildCount,
                                            int phase2OutlierCount) {
        System.out.println();
        System.out.println("=== PHASE 6 SUMMARY ===");
        System.out.printf("k sweep: %d..%d, best by silhouette = %d%n", e.kMin(), e.kMax(), bestK);
        System.out.printf("%-4s %14s %14s%n", "k", "WCSS", "silhouette");
        System.out.println("-".repeat(36));
        for (int i = 0; i < e.wcss().length; i++) {
            System.out.printf("%-4d %14.4f %14.4f%n", e.kMin() + i, e.wcss()[i], e.silhouette()[i]);
        }
        System.out.println();
        System.out.printf("%-12s %6s %12s %12s %s%n", "ClusterId", "Size", "AvgRisk", "Churn%", "Description");
        System.out.println("-".repeat(108));
        for (ClusterResponse c : summaries) {
            System.out.printf("%-12s %6d %12.4f %12.4f %s%n",
                    c.getClusterId(), c.getSize(),
                    c.getAvgRisk(), c.getChurnRate() * 100,
                    c.getDescription());
        }
        System.out.println();
        System.out.printf("Phase 2 outliers: %d | Cluster strong (>μ+2σ): %d | Cluster mild (>μ+1σ): %d%n",
                phase2OutlierCount, strongCount, mildCount);
        System.out.println();
    }
}
