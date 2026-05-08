package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import com.creditminer.dto.response.ClusterResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.clusterers.SimpleKMeans;
import weka.core.Instance;
import weka.core.Instances;

import java.util.List;

/**
 * Phase 6 — KMeans clustering + cluster lookup at inference time.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClusteringService {

    private final ModelConfig modelConfig;

    /**
     * Train final SimpleKMeans with the chosen k.
     *
     * <p>Use {@code seed=42}, {@code numIterations=500},
     * {@code distance=EuclideanDistance}.</p>
     */
    public SimpleKMeans train(Instances data, int k) throws Exception {
        // TODO
        return null;
    }

    /**
     * Run k=2..8 and return WCSS (elbow curve) + silhouette per k.
     */
    public ElbowResult elbow(Instances data, int kMin, int kMax) throws Exception {
        // TODO
        return null;
    }

    /** Assign cluster ID to a single instance using the loaded clusterer. */
    public int assign(Instance inst) throws Exception {
        if (modelConfig.getClusterer() == null) return -1;
        return modelConfig.getClusterer().clusterInstance(inst);
    }

    /** Build cluster summaries (read from DB usually; this rebuilds from raw). */
    public List<ClusterResponse> summarize(Instances data, SimpleKMeans km) {
        // TODO
        return List.of();
    }

    public record ElbowResult(double[] wcss, double[] silhouette) { }
}
