package com.creditminer.service;

import com.creditminer.dto.response.ChurnGroupResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import weka.core.Instances;

import java.io.StringReader;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EdaServiceTest {

    @Test
    void splitDistributionUsesSharedBinsAndConservesCounts() throws Exception {
        Instances data = new Instances(new StringReader("""
                @relation split_distribution
                @attribute value numeric
                @attribute Attrition_Flag {'Existing Customer','Attrited Customer'}
                @data
                0,'Existing Customer'
                1,'Attrited Customer'
                2,'Existing Customer'
                3,'Attrited Customer'
                4,'Existing Customer'
                5,'Attrited Customer'
                """));
        data.setClassIndex(data.attribute("Attrition_Flag").index());
        EdaDataCache cache = Mockito.mock(EdaDataCache.class);
        Mockito.when(cache.get()).thenReturn(data);

        DistributionResponse response = new EdaService(cache)
                .distribution("value", 5, "Attrition_Flag");

        assertEquals(6, response.getBinEdges().size());
        assertNotNull(response.getStats());
        assertEquals(2, response.getSeries().size());
        assertEquals(List.of("Existing Customer", "Attrited Customer"),
                response.getSeries().stream().map(DistributionResponse.Series::getLabel).toList());
        for (int bin = 0; bin < response.getCounts().size(); bin++) {
            int splitTotal = response.getSeries().get(0).getCounts().get(bin)
                    + response.getSeries().get(1).getCounts().get(bin);
            assertEquals(response.getCounts().get(bin), splitTotal);
        }
        assertEquals(response.getCounts().size(), response.getSeries().get(0).getCounts().size());
        assertEquals(response.getCounts().size(), response.getSeries().get(1).getCounts().size());
        assertEquals(3, response.getSeries().get(0).getStats().getCount());
        assertEquals(3, response.getSeries().get(1).getStats().getCount());
    }

    @Test
    void churnByAcceptsWhitelistedIntegerDimensionAndRejectsOtherNumericAttribute() throws Exception {
        Instances data = new Instances(new StringReader("""
                @relation numeric_churn_dimension
                @attribute Months_Inactive_12_mon numeric
                @attribute Credit_Limit numeric
                @attribute Attrition_Flag {'Existing Customer','Attrited Customer'}
                @data
                3,1000,'Existing Customer'
                1,2000,'Existing Customer'
                3,3000,'Attrited Customer'
                0,4000,'Attrited Customer'
                """));
        data.setClassIndex(data.attribute("Attrition_Flag").index());
        EdaDataCache cache = Mockito.mock(EdaDataCache.class);
        Mockito.when(cache.get()).thenReturn(data);
        EdaService service = new EdaService(cache);

        List<ChurnGroupResponse> groups = service.churnBy("Months_Inactive_12_mon");

        assertEquals(List.of("0", "1", "3"),
                groups.stream().map(ChurnGroupResponse::getGroup).toList());
        assertEquals(List.of(1, 1, 2),
                groups.stream().map(ChurnGroupResponse::getCount).toList());
        assertEquals(List.of(1, 0, 1),
                groups.stream().map(ChurnGroupResponse::getAttritedCount).toList());
        assertEquals(List.of(1.0, 0.0, 0.5),
                groups.stream().map(ChurnGroupResponse::getChurnRate).toList());

        BusinessException error = assertThrows(
                BusinessException.class, () -> service.churnBy("Credit_Limit"));
        assertEquals("VALIDATION_ERROR", error.getCode());
        assertEquals(400, error.getStatus().value());
    }
}
