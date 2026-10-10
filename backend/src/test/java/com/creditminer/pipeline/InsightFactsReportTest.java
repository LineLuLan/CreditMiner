package com.creditminer.pipeline;

import org.junit.jupiter.api.Test;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import weka.core.Utils;

import java.util.ArrayList;
import java.util.Map;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InsightFactsReportTest {

    @Test
    void preservesPermutationImportanceEvidenceWithoutRenormalizing() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var expected = mapper.readTree(new java.io.File("data/processed/phase5_feature_importance.json"));
        Object actual = org.springframework.test.util.ReflectionTestUtils.invokeMethod(
                InsightFactsReport.class, "buildFeatureImportance", mapper);
        assertEquals(expected, mapper.valueToTree(actual));
        assertEquals("PermutationImportance", expected.path("metric").asText());
    }

    @Test
    void realArtifactRetainsAgeWorstDelayAndPaymentRatioBuckets() throws Exception {
        var root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(
                new java.io.File("data/processed/phase9_insight_facts.json"));
        var buckets = root.path("defaultByBucket");
        assertEquals(339, buckets.path("AGE").get(4).path("count").asInt());
        assertEquals(0.6284, buckets.path("MAX_DELAY").get(3).path("defaultRate").asDouble());
        assertEquals(4, buckets.path("PAY_RATIO").size());
    }

    @Test
    void assignsCreditRiskBucketBoundariesFromSyntheticInstances() {
        Attribute utilization = new Attribute("AVG_UTILIZATION");
        Attribute delayed = new Attribute("MONTHS_DELAYED");
        Instances data = new Instances(
                "bucket-boundaries", new ArrayList<>(List.of(utilization, delayed)), 0);

        double[][] values = {
                {0.0, 0.0},
                {0.25, 1.0},
                {0.50, 2.0},
                {0.75, 3.0},
                {1.01, 4.0},
                {Utils.missingValue(), Utils.missingValue()}
        };
        for (double[] row : values) {
            data.add(new DenseInstance(1.0, row));
        }

        List<String> expectedUtilization = List.of(
                "<= 0", "(0, 0.25]", "(0.25, 0.5]", "(0.5, 1]", "> 1", "missing");
        List<String> expectedDelayed = List.of("0", "1", "2", "3", "4", "missing");

        for (int i = 0; i < data.numInstances(); i++) {
            assertEquals(expectedUtilization.get(i),
                    InsightFactsReport.avgUtilizationBucket(data.instance(i), utilization));
            assertEquals(expectedDelayed.get(i),
                    InsightFactsReport.monthsDelayedBucket(data.instance(i), delayed));
        }
    }

    @Test
    void overallFactsUseDefaultAndNonDefaultCounts() {
        Map<String, Object> overall = InsightFactsReport.overall(10, 3);

        assertEquals(10, overall.get("rows"));
        assertEquals(3, overall.get("defaults"));
        assertEquals(7, overall.get("nonDefaults"));
        assertEquals(0.3, (double) overall.get("defaultRate"), 0.0001);
    }
}
