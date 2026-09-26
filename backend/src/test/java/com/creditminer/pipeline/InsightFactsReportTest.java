package com.creditminer.pipeline;

import org.junit.jupiter.api.Test;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import weka.core.Utils;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InsightFactsReportTest {

    @Test
    void assignsInclusiveBucketBoundariesFromSyntheticInstances() {
        Attribute utilization = new Attribute("Avg_Utilization_Ratio");
        Attribute inactive = new Attribute("Months_Inactive_12_mon");
        Instances data = new Instances(
                "bucket-boundaries", new ArrayList<>(List.of(utilization, inactive)), 0);

        double[][] values = {
                {0.0, 0.0},
                {0.25, 1.0},
                {0.50, 2.0},
                {0.75, 3.0},
                {0.76, 4.0},
                {Utils.missingValue(), Utils.missingValue()}
        };
        for (double[] row : values) {
            data.add(new DenseInstance(1.0, row));
        }

        List<String> expectedUtilization = List.of(
                "0", "(0, 0.25]", "(0.25, 0.5]", "(0.5, 0.75]", "> 0.75", "missing");
        List<String> expectedInactive = List.of("0", "1", "2", "3", "4+", "missing");

        for (int i = 0; i < data.numInstances(); i++) {
            assertEquals(expectedUtilization.get(i),
                    InsightFactsReport.avgUtilizationBucket(data.instance(i), utilization));
            assertEquals(expectedInactive.get(i),
                    InsightFactsReport.monthsInactiveBucket(data.instance(i), inactive));
        }
    }
}
