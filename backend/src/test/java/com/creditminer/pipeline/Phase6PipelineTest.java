package com.creditminer.pipeline;

import com.creditminer.dto.response.ClusterResponse;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class Phase6PipelineTest {
    @Test
    void pcaSharesUseAllEigenvaluesRatherThanOnlyTheTwoExportedComponents() throws Exception {
        var attributes = new java.util.ArrayList<weka.core.Attribute>();
        for (int i = 0; i < 3; i++) attributes.add(new weka.core.Attribute("feature" + i));
        var matrix = new weka.core.Instances("orthogonal", attributes, 8);
        for (int i = 0; i < 8; i++) matrix.add(new weka.core.DenseInstance(1,
                new double[]{i & 1, (i >> 1) & 1, (i >> 2) & 1}));
        Object projection = ReflectionTestUtils.invokeMethod(Phase6Pipeline.class, "computePca2d", matrix);
        @SuppressWarnings("unchecked")
        List<Double> shares = (List<Double>) ReflectionTestUtils.getField(projection, "explainedVarianceOfTotal");
        assertThat(shares).hasSize(2).allSatisfy(share ->
                assertThat(share).isCloseTo(1. / 3, org.assertj.core.api.Assertions.within(1e-12)));
    }

    @Test
    void acceptsFourSemanticPersonasAndOnlyTheAuthorizedThreePersonaFallback() {
        var persistent = profile(5, .08);
        var occasional = profile(1.6, .25);
        var revolver = profile(0, .16);
        var transactor = profile(.1, .88);
        assertThat((Boolean) ReflectionTestUtils.invokeMethod(Phase6Pipeline.class, "fourPersonas",
                List.of(persistent, occasional, revolver, transactor))).isTrue();
        assertThat((Boolean) ReflectionTestUtils.invokeMethod(Phase6Pipeline.class, "fourPersonas",
                List.of(persistent, revolver, revolver, transactor))).isFalse();
        assertThat((Boolean) ReflectionTestUtils.invokeMethod(Phase6Pipeline.class, "threePersonas",
                List.of(persistent, revolver, transactor))).isTrue();
        assertThat((Boolean) ReflectionTestUtils.invokeMethod(Phase6Pipeline.class, "threePersonas",
                List.of(persistent, occasional, transactor))).isFalse();
    }

    private ClusterResponse profile(double delay, double ratio) {
        return ClusterResponse.builder().centroid(Map.of("MONTHS_DELAYED", delay, "PAY_RATIO", ratio)).build();
    }
}
