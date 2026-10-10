package com.creditminer.service;

import com.creditminer.dto.response.DefaultGroupResponse;
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
        Instances data = instances("""
                @relation split_distribution
                @attribute value numeric
                @attribute Default {No,Yes}
                @data
                0,No
                1,Yes
                2,No
                3,Yes
                4,No
                5,Yes
                """);
        EdaService service = service(data);

        DistributionResponse response = service.distribution("value", 5, "Default");

        assertEquals(6, response.getBinEdges().size());
        assertNotNull(response.getStats());
        assertEquals(List.of("No", "Yes"),
                response.getSeries().stream().map(DistributionResponse.Series::getLabel).toList());
        for (int bin = 0; bin < response.getCounts().size(); bin++) {
            assertEquals(response.getCounts().get(bin), response.getSeries().get(0).getCounts().get(bin)
                    + response.getSeries().get(1).getCounts().get(bin));
        }
    }

    @Test
    void defaultByAcceptsDelayDimensionAndRejectsUnlistedNumericColumn() throws Exception {
        Instances data = instances("""
                @relation rate_dimension
                @attribute PAY_1 numeric
                @attribute LIMIT_BAL numeric
                @attribute Default {No,Yes}
                @data
                2,1000,No
                0,2000,No
                2,3000,Yes
                -1,4000,Yes
                """);
        EdaService service = service(data);

        List<DefaultGroupResponse> groups = service.defaultBy("PAY_1");

        assertEquals(List.of("-1", "0", "2"), groups.stream().map(DefaultGroupResponse::getGroup).toList());
        assertEquals(List.of(1, 1, 2), groups.stream().map(DefaultGroupResponse::getCount).toList());
        assertEquals(List.of(1, 0, 1), groups.stream().map(DefaultGroupResponse::getDefaultCount).toList());
        assertEquals(List.of(1.0, 0.0, 0.5), groups.stream().map(DefaultGroupResponse::getDefaultRate).toList());

        BusinessException error = assertThrows(BusinessException.class,
                () -> service.defaultBy("LIMIT_BAL"));
        assertEquals("VALIDATION_ERROR", error.getCode());
    }

    @Test
    void defaultByGroupsAgeIntoStableBands() throws Exception {
        EdaService service = service(instances("""
                @relation age_bands
                @attribute AGE numeric
                @attribute Default {No,Yes}
                @data
                24,Yes
                35,No
                48,Yes
                57,No
                70,Yes
                """));

        List<DefaultGroupResponse> groups = service.defaultBy("AGE");

        assertEquals(List.of("<30", "30-39", "40-49", "50-59", "60+"),
                groups.stream().map(DefaultGroupResponse::getGroup).toList());
        assertEquals(List.of(1, 0, 1, 0, 1),
                groups.stream().map(DefaultGroupResponse::getDefaultCount).toList());
    }

    private static Instances instances(String arff) throws Exception {
        Instances data = new Instances(new StringReader(arff));
        data.setClassIndex(data.attribute("Default").index());
        return data;
    }

    private static EdaService service(Instances data) {
        EdaDataCache cache = Mockito.mock(EdaDataCache.class);
        Mockito.when(cache.get()).thenReturn(data);
        return new EdaService(cache);
    }
}
