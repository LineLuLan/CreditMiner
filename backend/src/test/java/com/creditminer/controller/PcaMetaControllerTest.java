package com.creditminer.controller;

import com.creditminer.service.DescribeCacheService;
import com.creditminer.service.EdaDataCache;
import com.creditminer.service.EdaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PcaMetaControllerTest {
    @TempDir Path temp;

    @Test
    void siblingEndpointKeepsOriginalArrayAndUsesCamelCaseBounds() throws Exception {
        Path artifact = temp.resolve("pca.json");
        Files.writeString(artifact, "{\"meta\":{\"explainedVarianceOfTotal\":[0.45,0.25]},\"points\":[{\"clientId\":1,\"clusterId\":0,\"x\":3,\"y\":4}]}");
        EdaService service = new EdaService(mock(EdaDataCache.class));
        ReflectionTestUtils.setField(service, "pcaJsonPath", artifact.toString());
        var mvc = MockMvcBuilders.standaloneSetup(new EdaController(mock(DescribeCacheService.class), service)).build();
        mvc.perform(get("/api/eda/pca-2d"))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].clientId").value(1));
        mvc.perform(get("/api/eda/pca-2d/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pointCount").value(1))
                .andExpect(jsonPath("$.explainedVarianceOfTotal[0]").value(.45))
                .andExpect(jsonPath("$.explainedVarianceOfTotal[1]").value(.25))
                .andExpect(jsonPath("$.outsideCount").value(0))
                .andExpect(jsonPath("$.zoomBounds.xMin").value(3.0))
                .andExpect(jsonPath("$.zoomBounds.xMax").value(3.0))
                .andExpect(jsonPath("$.zoomBounds.yMin").value(4.0))
                .andExpect(jsonPath("$.zoomBounds.yMax").value(4.0))
                .andExpect(jsonPath("$.explainedVariance[0]").value(0.0))
                .andExpect(jsonPath("$.explainedVarianceScope").isString());
    }
}
