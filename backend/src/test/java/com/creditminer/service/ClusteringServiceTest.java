package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Tests for {@link ClusteringService}. Covers the null-safety branches of
 * {@link ClusteringService#assign(Instance)} and
 * {@link ClusteringService#assignFromEnriched(Instance)}.
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
    void assignFromEnrichedReturnsMinusOneWhenAnyArtifactMissing() throws Exception {
        // Case 1: clusterer null
        ModelConfig cfg = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg.getClusterer()).thenReturn(null);
        ClusteringService svc = new ClusteringService(cfg);
        assertEquals(-1, svc.assignFromEnriched(buildSingleAttrInstance()));

        // Case 2: header null even if clusterer exists
        ModelConfig cfg2 = Mockito.mock(ModelConfig.class);
        Mockito.when(cfg2.getClusterer()).thenReturn(Mockito.mock(weka.clusterers.Clusterer.class));
        Mockito.when(cfg2.getClustererNormalizer()).thenReturn(Mockito.mock(weka.filters.Filter.class));
        Mockito.when(cfg2.getClustererInputHeader()).thenReturn(null);
        ClusteringService svc2 = new ClusteringService(cfg2);
        assertEquals(-1, svc2.assignFromEnriched(buildSingleAttrInstance()));
    }

    private static Instance buildSingleAttrInstance() {
        Attribute a = new Attribute("x");
        Instances ds = new Instances("t", new ArrayList<>(List.of(a)), 1);
        DenseInstance inst = new DenseInstance(1.0, new double[] { 0.5 });
        ds.add(inst);
        return ds.instance(0);
    }
}
