package com.creditminer.service;

import com.creditminer.config.ModelConfig;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    @Test
    void summarizesOnlyCreditBehaviourFeaturesAndComputesDefaultRate() {
        Instances data = creditRows();
        ClusteringService service = new ClusteringService(Mockito.mock(ModelConfig.class));

        var clusters = service.summarize(data, new int[] {0, 0, 1}, 2);

        assertEquals(2, clusters.size());
        assertEquals(0.5, clusters.get(0).getDefaultRate(), 0.0001);
        assertEquals(1.0, clusters.get(1).getDefaultRate(), 0.0001);
        assertEquals(ClusteringService.CLUSTER_FEATURES,
                new ArrayList<>(clusters.get(0).getCentroid().keySet()));
        assertTrue(clusters.get(1).getPersonaName().contains("Default"));
        assertTrue(clusters.get(1).getDescription().contains("months delayed"));
    }

    private static Instance buildSingleAttrInstance() {
        Attribute a = new Attribute("x");
        Instances ds = new Instances("t", new ArrayList<>(List.of(a)), 1);
        DenseInstance inst = new DenseInstance(1.0, new double[] { 0.5 });
        ds.add(inst);
        return ds.instance(0);
    }

    private static Instances creditRows() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("ID"));
        for (String feature : ClusteringService.CLUSTER_FEATURES) {
            attributes.add(new Attribute(feature));
        }
        attributes.add(new Attribute("RISK_TIER", new ArrayList<>(List.of("Low", "Medium", "High"))));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances data = new Instances("credit", attributes, 3);
        data.setClassIndex(data.attribute("Default").index());
        add(data, 1, new double[] {0.2, 0.3, 0.4, 0, 0, 0.1, 100000, 30}, "Low", "No");
        add(data, 2, new double[] {0.8, 0.9, 0.1, 2, 3, 0.5, 50000, 45}, "Medium", "Yes");
        add(data, 3, new double[] {1.5, 1.2, 0.05, 5, 6, 1.2, 30000, 55}, "High", "Yes");
        return data;
    }

    private static void add(
            Instances data, long id, double[] features, String riskTier, String defaultValue) {
        double[] values = new double[data.numAttributes()];
        values[0] = id;
        System.arraycopy(features, 0, values, 1, features.length);
        values[values.length - 2] = data.attribute("RISK_TIER").indexOfValue(riskTier);
        values[values.length - 1] = data.attribute("Default").indexOfValue(defaultValue);
        data.add(new DenseInstance(1.0, values));
    }
}
