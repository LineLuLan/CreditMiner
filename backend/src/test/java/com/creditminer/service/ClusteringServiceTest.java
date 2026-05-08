package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Stub tests for {@link ClusteringService}.
 */
class ClusteringServiceTest {

    @Test
    void contextLoads() {
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        ClusteringService svc = new ClusteringService(cfg);
        assertNotNull(svc);
    }

    @Test
    void assignReturnsMinusOneWhenClustererNotLoaded() throws Exception {
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg.getClusterer()).thenReturn(null);
        ClusteringService svc = new ClusteringService(cfg);
        assertEquals(-1, svc.assign(null));
    }

    @Test
    @Disabled("TODO: enable after BE-60/BE-61 (elbow + silhouette)")
    void elbowProducesMonotonicallyDecreasingWcss() { }

    @Test
    @Disabled("TODO: enable after BE-62 (final KMeans)")
    void trainProducesKClusters() { }
}
