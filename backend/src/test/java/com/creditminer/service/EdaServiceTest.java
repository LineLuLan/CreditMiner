package com.creditminer.service;

import com.creditminer.dto.response.DefaultGroupResponse;
import com.creditminer.dto.response.DistributionResponse;
import com.creditminer.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;
import weka.core.Instances;

import java.io.StringReader;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EdaServiceTest {
    @Test
    void defaultByMergesLatePaymentTailForEveryMonth() throws Exception {
        for (int month = 1; month <= 6; month++) {
            String dimension = "PAY_" + month;
            var groups = service(instances("@relation late\n@attribute " + dimension
                    + " numeric\n@attribute Default {No,Yes}\n@data\n"
                    + "-2,No\n-1,Yes\n0,No\n1,Yes\n2,No\n3,Yes\n4,No\n8,Yes\n"))
                    .defaultBy(dimension);
            assertEquals(List.of("-2", "-1", "0", "1", "2", "3+ months late"),
                    groups.stream().map(DefaultGroupResponse::getGroup).toList());
            assertEquals(3, groups.get(5).getCount());
            assertEquals(2, groups.get(5).getDefaultCount());
            assertEquals(.6667, groups.get(5).getDefaultRate());
        }
    }

    @Test
    void niceEdgesCoverSignedValuesAndMinimizeRequestedCountDifference() throws Exception {
        var response = service(numericData(-3, 0, 8, 17, 33, 42, 63, 88, 103))
                .distribution("value", 10, "Default");
        assertEquals(List.of(-10.0, 0.0, 10.0, 20.0, 30.0, 40.0, 50.0,
                60.0, 70.0, 80.0, 90.0, 100.0, 110.0), response.getBinEdges());
        assertEquals(9, response.getCounts().stream().mapToInt(Integer::intValue).sum());
        assertEquals(List.of(1, 2, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1), response.getCounts());
        assertEquals("equal-width", new ObjectMapper().valueToTree(response).path("binning").asText());
        assertEquals(new ObjectMapper().valueToTree(response).path("binEdges"),
                new ObjectMapper().valueToTree(response).path("edges"));
        assertTrue(new ObjectMapper().valueToTree(response).path("notes").isArray());
    }

    @Test
    void quantilesUseRawValuesAndRetainRepeatedPercentileEdges() throws Exception {
        var response = quantile(service(numericData(0, 0, 0, 0, 0, 0, 1, 2, 4, 8, 100)), 10);
        assertEquals(List.of(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 2.0, 4.0, 8.0, 100.0),
                response.getBinEdges());
        assertEquals(List.of(0, 0, 0, 0, 0, 6, 1, 1, 1, 2), response.getCounts());
        assertEquals("quantile", new ObjectMapper().valueToTree(response).path("binning").asText());
        assertTrue(new ObjectMapper().valueToTree(response).path("notes").toString().contains("Repeated"));
        for (int bin = 0; bin < response.getCounts().size(); bin++) {
            assertEquals(response.getCounts().get(bin), response.getSeries().get(0).getCounts().get(bin)
                    + response.getSeries().get(1).getCounts().get(bin));
        }
    }

    @Test
    void quantilesInterpolateAndHandleConstantAndMissingValues() throws Exception {
        var interpolated = quantile(service(numericData(0, 10)), 10);
        assertEquals(List.of(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0),
                interpolated.getBinEdges());
        var constant = quantile(service(numericData(7, 7, 7, Double.NaN)), 10);
        assertEquals(java.util.Collections.nCopies(11, 7.0), constant.getBinEdges());
        assertEquals(3, constant.getCounts().stream().mapToInt(Integer::intValue).sum());
        assertEquals(3, constant.getCounts().get(9));
        var missing = quantile(service(numericData(Double.NaN)), 10);
        assertEquals(List.of(), missing.getBinEdges());
        assertEquals(List.of(), missing.getCounts());
    }

    @Test
    void niceEdgesRetainSmallDecimalPrecisionAndConstantCounts() throws Exception {
        var response = service(numericData(.0000001, .0000007)).distribution("value", 5);
        assertTrue(response.getBinEdges().get(0) <= .0000001);
        assertTrue(response.getBinEdges().get(response.getBinEdges().size() - 1) >= .0000007);
        for (int i = 1; i < response.getBinEdges().size(); i++) {
            assertTrue(response.getBinEdges().get(i) > response.getBinEdges().get(i - 1));
        }
        var constant = service(numericData(7, 7, 7)).distribution("value", 10);
        assertEquals(List.of(7.0, 8.0), constant.getBinEdges());
        assertEquals(List.of(3), constant.getCounts());
        assertEquals(List.of(7.0, 8.0), service(numericData(7.3, 7.3))
                .distribution("value", 10).getBinEdges());
    }

    @Test
    void sparseSourceBinsRemainAvailableForExistingDisplayTailMerge() throws Exception {
        double[] values = new double[2001];
        values[2000] = 100;
        var response = service(numericData(values)).distribution("value", 10);
        assertEquals(11, response.getBinEdges().size());
        assertEquals(1, response.getCounts().get(9));
        assertTrue(new ObjectMapper().valueToTree(response).path("notes").toString().contains("Sparse"));
    }

    private static DistributionResponse quantile(EdaService service, int bins) {
        return ReflectionTestUtils.invokeMethod(service, "distribution", "value", bins, "Default", "quantile");
    }

    private static Instances numericData(double... values) throws Exception {
        StringBuilder arff = new StringBuilder("@relation numeric\n@attribute value numeric\n"
                + "@attribute Default {No,Yes}\n@data\n");
        for (int i = 0; i < values.length; i++) {
            arff.append(Double.isNaN(values[i]) ? "?" : Double.toString(values[i]))
                    .append(i % 2 == 0 ? ",No\n" : ",Yes\n");
        }
        return instances(arff.toString());
    }

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
