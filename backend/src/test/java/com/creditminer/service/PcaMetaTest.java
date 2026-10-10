package com.creditminer.service;

import com.creditminer.dto.response.PcaPointResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.mock;

class PcaMetaTest {
    @TempDir Path temporaryDirectory;

    @Test
    void computesCenteredVarianceSharesQuantilesAndOutsideUnion() {
        var points = IntStream.rangeClosed(0, 100)
                .mapToObj(i -> new PcaPointResponse(i, 0, 100 + i, 200 + 2 * i)).toList();
        var meta = EdaService.computePcaMeta(points);
        assertThat(meta.getExplainedVariance()).containsExactly(.2, .8);
        assertThat(meta.getExplainedVarianceScope()).contains("two exported components", "not");
        assertThat(meta.getZoomBounds().getXMin()).isEqualTo(101);
        assertThat(meta.getZoomBounds().getXMax()).isEqualTo(199);
        assertThat(meta.getZoomBounds().getYMin()).isEqualTo(202);
        assertThat(meta.getZoomBounds().getYMax()).isEqualTo(398);
        assertThat(meta.getOutsideCount()).isEqualTo(2);
        assertThat(meta.getPointCount()).isEqualTo(101);
    }

    @Test
    void emptyAndConstantProjectionHaveNoExplainedVariance() {
        var empty = EdaService.computePcaMeta(List.of());
        assertThat(empty.getPointCount()).isZero();
        assertThat(empty.getZoomBounds()).isNull();
        assertThat(empty.getExplainedVariance()).containsExactly(0.0, 0.0);
        var constant = EdaService.computePcaMeta(List.of(new PcaPointResponse(1, 0, 3, 4)));
        assertThat(constant.getExplainedVariance()).containsExactly(0.0, 0.0);
        assertThat(constant.getOutsideCount()).isZero();
    }

    @Test
    void interpolatesPercentilesAndInvalidatesCachedMetadataWithPoints() throws Exception {
        Path artifact = temporaryDirectory.resolve("pca.json");
        Files.writeString(artifact, "{\"points\":[{\"x\":0,\"y\":0},{\"x\":10,\"y\":20}]}");
        EdaService service = new EdaService(mock(EdaDataCache.class));
        ReflectionTestUtils.setField(service, "pcaJsonPath", artifact.toString());
        var first = service.pcaMeta();
        assertThat(first.getZoomBounds().getXMin()).isCloseTo(.1, within(1e-12));
        assertThat(first.getZoomBounds().getYMax()).isCloseTo(19.8, within(1e-12));
        assertThat(service.pcaMeta()).isSameAs(first);
        Files.writeString(artifact, "{\"points\":[]}");
        service.invalidatePca();
        assertThat(service.pcaMeta().getPointCount()).isZero();
    }
}
