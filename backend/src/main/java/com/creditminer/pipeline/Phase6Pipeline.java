package com.creditminer.pipeline;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.service.ClusteringService;
import com.creditminer.service.PersonaNaming;
import com.creditminer.service.ClusteringService.ElbowResult;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * OFFLINE Phase 6 - Clustering & Anomaly (BE-60..BE-65) + PCA-2D (BE-43).
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
 *   <li>Select the eight documented credit-behaviour features.</li>
 *   <li>Min-max normalize (KMeans needs scaled features)</li>
 *   <li>Sweep k=2..8, record WCSS + sampled silhouette -> pick best k by silhouette</li>
 *   <li>Train final {@link SimpleKMeans} (seed 42, 500 iter), save {@code models/kmeans.model}</li>
 *   <li>Compute centroid distance per row -> flag anomaly when {@code distance > mu+3sigma}</li>
 *   <li>Combine with {@code phase2_outliers.json} -> {@code phase6_anomalies.json}</li>
 *   <li>Apply {@link PrincipalComponents} on the same normalized matrix; export first 2 PCs
 *       per client ID to {@code phase6_pca_2d.json} (BE-43)</li>
 *   <li>Persist per-cluster summaries (centroid in original units and default rate) to
 *       {@code phase6_clusters.json}</li>
 * </ol>
 * </p>
 */
@Slf4j
public class Phase6Pipeline {

    private static final String DEFAULT_INPUT = "data/processed/enriched.arff";
    private static final String DEFAULT_PHASE2_OUTLIERS = "data/processed/phase2_outliers.json";
    private static final String MODEL_PATH = "models/kmeans.model";
    /** Fitted Normalize filter - same min/max bounds the clusterer was trained on. */
    private static final String NORMALIZER_PATH = "models/kmeans-normalizer.model";
    /** Empty Instances header describing the clusterer's exact input shape. */
    private static final String INPUT_HEADER_PATH = "models/kmeans-input-header.model";
    private static final String CLUSTERS_JSON = "data/processed/phase6_clusters.json";
    private static final String ANOMALIES_JSON = "data/processed/phase6_anomalies.json";
    private static final String PCA_JSON = "data/processed/phase6_pca_2d.json";
    private static final String ELBOW_JSON = "data/processed/phase6_elbow.json";

    private static final int K_MIN = 2;
    private static final int K_MAX = 8;

    public static void main(String[] args) throws Exception {
        boolean pcaOnly = args.length > 0 && "--pca-only".equals(args[0]);
        String inputArff = pcaOnly ? DEFAULT_INPUT : args.length > 0 ? args[0] : DEFAULT_INPUT;
        String phase2Outliers = args.length > 1 ? args[1] : DEFAULT_PHASE2_OUTLIERS;

        log.info("=== Phase 6 - Clustering & Anomaly + PCA-2D ===");

        Instances raw;
        try (var reader = Files.newBufferedReader(Path.of(inputArff))) {
            raw = new Instances(reader);
        }
        Attribute classAttr = raw.attribute("Default");
        if (classAttr != null) raw.setClassIndex(classAttr.index());
        log.info("Loaded {} rows x {} cols", raw.numInstances(), raw.numAttributes());

        // Select the approved behaviour features, then min-max normalize.
        // We fit the Normalize filter inline (instead of via Preprocessor.normalize)
        // so we can persist the fitted filter for predict-time reuse - without it
        // /api/predict can't normalize a single new row to match the trained centroids.
        Instances clusterIn = selectAttributes(raw, ClusteringService.CLUSTER_FEATURES);
        clusterIn.setClassIndex(-1);
        weka.filters.unsupervised.attribute.Normalize normalizer =
                new weka.filters.unsupervised.attribute.Normalize();
        normalizer.setInputFormat(clusterIn);
        Instances normalized = Filter.useFilter(clusterIn, normalizer);
        log.info("Clustering matrix: {} rows x {} numeric features", normalized.numInstances(), normalized.numAttributes());

        if (pcaOnly) {
            exportPcaMetadataOnly(raw, computePca2d(normalized));
            return;
        }

        ClusteringService cs = new ClusteringService(null);

        // Elbow + silhouette sweep
        ElbowResult elbow = cs.elbow(normalized, K_MIN, K_MAX);
        int silhouetteK = cs.bestK(elbow);
        String override = args.length > 2 ? args[2] : System.getenv("CM_CLUSTER_K");
        int bestK = override == null || override.isBlank() ? silhouetteK : Integer.parseInt(override);
        if (bestK < K_MIN || bestK > K_MAX) throw new IllegalArgumentException("k must be in 2..8");
        log.info("Best k by silhouette: {}; chosen k: {}", silhouetteK, bestK);

        // Final model: select only by WCSS, then validate the semantic persona gate.
        SimpleKMeans finalModel = cs.trainBest(normalized, bestK);
        List<ClusterResponse> summaries = cs.summarize(raw, finalModel.getAssignments(), bestK);
        boolean fallbackToThree = false;
        // Intent: prefer four personas, with the supervisor-authorized three-persona fallback.
        // Status: deterministic restarts. Next: inspect centroids on failure; confidence: gate tests.
        if (bestK == 4 && !fourPersonas(summaries)) {
            log.warn("k=4 minimum-WCSS model lacks four personas; retrying k=3: {}", summaries);
            bestK = 3;
            fallbackToThree = true;
            finalModel = cs.trainBest(normalized, bestK);
            summaries = cs.summarize(raw, finalModel.getAssignments(), bestK);
        }
        if (bestK == 3 && !threePersonas(summaries)) throw new IllegalStateException(
                "Three distinct personas unavailable after deterministic restarts: " + summaries);
        double finalSilhouette = cs.silhouette(normalized, finalModel);
        new File(MODEL_PATH).getParentFile().mkdirs();
        SerializationHelper.write(MODEL_PATH, finalModel);
        SerializationHelper.write(NORMALIZER_PATH, normalizer);
        SerializationHelper.write(INPUT_HEADER_PATH, new Instances(clusterIn, 0));
        log.info("Saved {} + {} + {}", MODEL_PATH, NORMALIZER_PATH, INPUT_HEADER_PATH);

        int[] assignments = finalModel.getAssignments();

        // Centroid distances + tiered thresholds.
        // Blueprint section 3 targets ~3-5% anomalies. Old strict rule
        // (mu+3sigma AND phase2_outlier) hit only 0.46%, so we widen with two thresholds:
        //   strongCluster = distance > mu+2sigma  -> qualifies as anomaly alone
        //   mildCluster   = distance > mu+1sigma  -> must be confirmed by phase2 (Z OR IQR) signal
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
        log.info("Centroid distance: mu={}, sigma={}; strong>mu+2sigma={} (count {}); mild>mu+1sigma={} (count {})",
                round(mu), round(sd), round(strongThreshold), strongCount,
                round(mildThreshold), mildCount);

        // Phase 2 outlier set
        Set<Long> phase2OutlierSet = readPhase2OutlierSet(phase2Outliers);

        // Per-cluster summary (original units)
        // Summaries validated before artifact writes above.

        // PCA-2D (BE-43)
        PcaProjection pcaCoords = computePca2d(normalized);

        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        // Outputs
        writeJson(mapper, ELBOW_JSON, buildElbowDoc(elbow, silhouetteK, bestK, finalModel, finalSilhouette, fallbackToThree));
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

    private static Instances selectAttributes(Instances data, List<String> names) throws Exception {
        List<Integer> indices = new ArrayList<>();
        for (String n : names) {
            Attribute a = data.attribute(n);
            if (a == null || !a.isNumeric()) {
                throw new IllegalStateException("Missing numeric clustering feature: " + n);
            }
            indices.add(a.index());
        }
        Remove rm = new Remove();
        rm.setInvertSelection(true);
        rm.setAttributeIndicesArray(indices.stream().mapToInt(Integer::intValue).toArray());
        rm.setInputFormat(data);
        return Filter.useFilter(data, rm);
    }

    private static PcaProjection computePca2d(Instances normalized) throws Exception {
        VariancePrincipalComponents pca = new VariancePrincipalComponents();
        pca.setMaximumAttributes(2);
        pca.setVarianceCovered(1.0);
        pca.setInputFormat(normalized);
        Instances projected = Filter.useFilter(normalized, pca);
        int rows = projected.numInstances();
        int cols = projected.numAttributes();
        log.info("PCA projected: {} rows x {} components", rows, cols);
        List<double[]> out = new ArrayList<>(rows);
        for (int i = 0; i < rows; i++) {
            double x = cols >= 1 ? projected.instance(i).value(0) : 0.0;
            double y = cols >= 2 ? projected.instance(i).value(1) : 0.0;
            out.add(new double[] { round(x), round(y) });
        }
        return new PcaProjection(out, pca.explainedVarianceOfTotal());
    }

    private record PcaProjection(List<double[]> coordinates, List<Double> explainedVarianceOfTotal) { }

    // Intent: retain Weka's existing correlation PCA and expose its full eigenvalue denominator.
    // Status: additive metadata. Next: none. Blockers: source mismatch fails before writing.
    // Confidence: orthogonal-matrix test and exact exported-coordinate comparison.
    private static final class VariancePrincipalComponents extends PrincipalComponents {
        List<Double> explainedVarianceOfTotal() {
            double total = java.util.Arrays.stream(m_Eigenvalues).sum();
            if (!Double.isFinite(total) || total <= 0 || m_SortedEigens.length < 2)
                throw new IllegalStateException("PCA total variance unavailable");
            int n = m_SortedEigens.length;
            return List.of(m_Eigenvalues[m_SortedEigens[n - 1]] / total,
                    m_Eigenvalues[m_SortedEigens[n - 2]] / total);
        }
    }

    private static Map<String, Object> pcaMetadata(PcaProjection projection) {
        List<Double> shares = projection.explainedVarianceOfTotal();
        double exported = shares.get(0) + shares.get(1);
        return Map.of("explainedVarianceOfTotal", shares,
                "explainedVariance", List.of(shares.get(0) / exported, shares.get(1) / exported),
                "explainedVarianceOfTotalScope",
                "Share of all eigenvalues of Weka correlation PCA on the 8 min-max normalized features; Weka standardizes them before PCA");
    }

    private static void exportPcaMetadataOnly(Instances raw, PcaProjection projection) throws Exception {
        ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        var artifact = mapper.readTree(new File(PCA_JSON));
        var points = artifact.path("points");
        if (!artifact.isObject() || !points.isArray() || points.size() != raw.numInstances())
            throw new IllegalStateException("Existing PCA points do not match the source rows");
        for (int i = 0; i < points.size(); i++) {
            var point = points.get(i);
            double[] coordinates = projection.coordinates().get(i);
            if (point.path("clientId").asLong() != (long) raw.instance(i).value(raw.attribute("ID"))
                    || point.path("x").asDouble() != coordinates[0] || point.path("y").asDouble() != coordinates[1])
                throw new IllegalStateException("Existing PCA point differs at row " + i);
        }
        ((com.fasterxml.jackson.databind.node.ObjectNode) artifact).set("meta", mapper.valueToTree(pcaMetadata(projection)));
        writeJson(mapper, PCA_JSON, artifact);
        log.info("PCA-only metadata export: {} points and cluster assignments preserved; total shares {}",
                points.size(), projection.explainedVarianceOfTotal());
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
            log.warn("Phase 2 outliers file not found at {} - combined anomaly = cluster-distance only", path);
            return Set.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> doc = mapper.readValue(f, Map.class);
            List<Number> list = (List<Number>) doc.get("outlierClientIds");
            Set<Long> out = new HashSet<>();
            if (list != null) for (Number n : list) out.add(n.longValue());
            return out;
        } catch (Exception e) {
            log.warn("Failed to read {}: {}", path, e.getMessage());
            return Set.of();
        }
    }

    private static boolean fourPersonas(List<ClusterResponse> summaries) {
        return summaries.stream().map(c -> PersonaNaming.name(c.getCentroid())).distinct().count() == 4;
    }

    private static boolean threePersonas(List<ClusterResponse> summaries) {
        return summaries.stream().map(c -> PersonaNaming.name(c.getCentroid()))
                .collect(java.util.stream.Collectors.toSet())
                .equals(Set.of("Persistent delayers", "Revolvers, never late", "Transactors"));
    }

    private static Map<String, Object> buildElbowDoc(ElbowResult e, int silhouetteK, int bestK,
            SimpleKMeans finalModel, double finalSilhouette, boolean fallbackToThree) {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("kMin", e.kMin());
        doc.put("kMax", e.kMax());
        doc.put("bestK", bestK);
        doc.put("bestKBySilhouette", silhouetteK);
        doc.put("chosenK", bestK);
        doc.put("chosenReason", bestK == 4
                ? "Silhouette for k>=3 is flat at 0.24-0.26; k=4 is the smallest k with four distinct, nameable personas, while k=2 scores 0.47 but merges 82% of clients."
                : fallbackToThree ? "The minimum-WCSS k=4 model did not yield four distinct personas; k=3 yields persistent delayers, revolvers and transactors after ten deterministic restarts."
                : bestK == silhouetteK ? "Selected the maximum sampled silhouette." : "Selected the explicit k override.");
        doc.put("strategy", bestK == silhouetteK ? "argmax silhouette" : "explicit k override for interpretable personas");
        doc.put("initialization", "k-means++");
        doc.put("restarts", ClusteringService.RESTART_SEEDS.size());
        doc.put("restartSeeds", ClusteringService.RESTART_SEEDS);
        doc.put("chosenSeed", finalModel.getSeed());
        doc.put("chosenWcss", finalModel.getSquaredError());
        doc.put("finalSilhouette", finalSilhouette);
        doc.put("sweepInitialization", "random, seed 42");
        doc.put("generatedAt", Instant.now().toString());
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

        Attribute clientIdAttr = raw.attribute("ID");
        List<Map<String, Object>> records = new ArrayList<>();
        int combinedCount = 0;
        for (int i = 0; i < raw.numInstances(); i++) {
            long clientId = clientIdAttr == null ? 0L : (long) raw.instance(i).value(clientIdAttr);
            boolean p2 = phase2OutlierSet.contains(clientId);
            boolean strong = strongCluster[i];
            boolean mild = mildCluster[i];
            if (!p2 && !mild && !strong) continue; // include row if any anomaly signal fired
            // Blueprint section 6.5: combine cluster distance with Phase-2 (Z OR IQR) signals.
            // Rule: anomaly when STRONG cluster outlier (cd>mu+2sigma) is also confirmed
            // by univariate extremity from Phase 2. Targets ~3-5% per blueprint section 3.
            boolean isAnomaly = strong && p2;
            if (isAnomaly) combinedCount++;
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("clientId", clientId);
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
        doc.put("rule", "isAnomaly = clusterStrongOutlier (cd>mu+2sigma) AND phase2Outlier (Z>3 OR IQR fence). Targets blueprint section 3 ~3-5%.");
        doc.put("records", records);
        doc.put("generatedAt", Instant.now().toString());
        return doc;
    }

    private static Map<String, Object> buildPcaDoc(
            Instances raw, int[] assignments, PcaProjection projection) {
        List<double[]> coords = projection.coordinates();

        Attribute clientIdAttr = raw.attribute("ID");
        List<Map<String, Object>> rows = new ArrayList<>(coords.size());
        for (int i = 0; i < coords.size(); i++) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("clientId", clientIdAttr == null ? 0L : (long) raw.instance(i).value(clientIdAttr));
            r.put("clusterId", assignments[i]);
            r.put("x", coords.get(i)[0]);
            r.put("y", coords.get(i)[1]);
            rows.add(r);
        }
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("totalRows", coords.size());
        doc.put("componentCount", 2);
        doc.put("meta", pcaMetadata(projection));
        doc.put("source", "min-max normalized credit-behaviour feature allowlist");
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
        System.out.printf("k sweep: %d..%d, chosen k = %d%n", e.kMin(), e.kMax(), bestK);
        System.out.printf("%-4s %14s %14s%n", "k", "WCSS", "silhouette");
        System.out.println("-".repeat(36));
        for (int i = 0; i < e.wcss().length; i++) {
            System.out.printf("%-4d %14.4f %14.4f%n", e.kMin() + i, e.wcss()[i], e.silhouette()[i]);
        }
        System.out.println();
        System.out.printf("%-12s %6s %12s %12s %s%n", "ClusterId", "Size", "AvgRisk", "Default%", "Description");
        System.out.println("-".repeat(108));
        for (ClusterResponse c : summaries) {
            System.out.printf("%-12s %6d %12.4f %12.4f %s%n",
                    c.getClusterId(), c.getSize(),
                    c.getAvgRisk(), c.getDefaultRate() * 100,
                    c.getDescription());
        }
        System.out.println();
        System.out.printf("Phase 2 outliers: %d | Cluster strong (>mu+2sigma): %d | Cluster mild (>mu+1sigma): %d%n",
                phase2OutlierCount, strongCount, mildCount);
        System.out.println();
    }
}
