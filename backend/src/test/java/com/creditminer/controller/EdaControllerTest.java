package com.creditminer.controller;

import com.creditminer.exception.GlobalExceptionHandler;
import com.creditminer.service.DescribeCacheService;
import com.creditminer.service.EdaDataCache;
import com.creditminer.service.EdaService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import weka.core.Instances;

import java.io.StringReader;
import java.util.List;

import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EdaControllerTest {
    @Test
    void invalidBinningReturnsValidationErrorThroughHttp() throws Exception {
        mvc().perform(get("/api/eda/distribution")
                        .param("col", "LIMIT_BAL").param("binning", "bogus"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.path").value("/api/eda/distribution"));
    }

    @Test
    void quantileQueryBindsToRawValuePercentilesAndSharedClassBins() throws Exception {
        List<Double> edges = List.of(10000.0, 10000.0, 10000.0, 10000.0, 10000.0,
                10000.0, 20000.0, 30000.0, 50000.0, 90000.0, 1000000.0);
        mvc().perform(get("/api/eda/distribution")
                        .param("col", "LIMIT_BAL").param("bins", "10")
                        .param("binning", "quantile").param("split", "Default"))
                .andDo(result -> System.out.println("EDA_QUANTILE_HTTP " + result.getResponse().getContentAsString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.column").value("LIMIT_BAL"))
                .andExpect(jsonPath("$.binning").value("quantile"))
                .andExpect(jsonPath("$.binEdges").value(equalTo(edges)))
                .andExpect(jsonPath("$.edges").value(equalTo(edges)))
                .andExpect(jsonPath("$.counts").value(equalTo(List.of(0, 0, 0, 0, 0, 6, 1, 1, 1, 2))))
                .andExpect(jsonPath("$.stats.count").value(11))
                .andExpect(jsonPath("$.series[0].label").value("No"))
                .andExpect(jsonPath("$.series[0].counts").value(equalTo(List.of(0, 0, 0, 0, 0, 3, 1, 0, 1, 1))))
                .andExpect(jsonPath("$.series[1].label").value("Yes"))
                .andExpect(jsonPath("$.series[1].counts").value(equalTo(List.of(0, 0, 0, 0, 0, 3, 0, 1, 0, 1))));
    }

    private MockMvc mvc() throws Exception {
        Instances data = new Instances(new StringReader("""
                @relation http_quantiles
                @attribute LIMIT_BAL numeric
                @attribute Default {No,Yes}
                @data
                10000,No
                10000,Yes
                10000,No
                10000,Yes
                10000,No
                10000,Yes
                20000,No
                30000,Yes
                50000,No
                90000,Yes
                1000000,No
                """));
        data.setClassIndex(data.attribute("Default").index());
        EdaDataCache cache = mock(EdaDataCache.class);
        when(cache.get()).thenReturn(data);
        return MockMvcBuilders.standaloneSetup(new EdaController(
                        mock(DescribeCacheService.class), new EdaService(cache)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }
}
