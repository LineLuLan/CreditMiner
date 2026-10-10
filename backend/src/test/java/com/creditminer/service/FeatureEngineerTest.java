package com.creditminer.service;

import org.junit.jupiter.api.Test;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FeatureEngineerTest {

    private final FeatureEngineer engineer = new FeatureEngineer();

    @Test
    void computesUtilizationOneFromNewestBill() {
        Instances out = engineer.run(fixture());
        assertEquals(0.5, value(out, FeatureEngineer.F_UTILIZATION_1), 1e-9);
    }

    @Test
    void computesAverageOfSixMonthlyUtilizations() {
        Instances out = engineer.run(fixture());
        assertEquals(1.4 / 6.0, value(out, FeatureEngineer.F_AVG_UTILIZATION), 1e-9);
    }

    @Test
    void computesPaymentRatioUsingOnlyPositiveBillsInDenominator() {
        Instances out = engineer.run(fixture());
        assertEquals(0.4, value(out, FeatureEngineer.F_PAY_RATIO), 1e-9);
    }

    @Test
    void countsDelayedMonths() {
        Instances out = engineer.run(fixture());
        assertEquals(2, value(out, FeatureEngineer.F_MONTHS_DELAYED), 1e-9);
    }

    @Test
    void findsMaximumDelay() {
        Instances out = engineer.run(fixture());
        assertEquals(2, value(out, FeatureEngineer.F_MAX_DELAY), 1e-9);
    }

    @Test
    void computesNewestToOldestBillTrend() {
        Instances out = engineer.run(fixture());
        assertEquals(0.6, value(out, FeatureEngineer.F_BILL_TREND), 1e-9);
    }

    @Test
    void assignsDocumentedHighRiskTier() {
        Instances out = engineer.run(fixture());
        assertEquals("High", out.instance(0).stringValue(out.attribute(FeatureEngineer.F_RISK_TIER)));
    }

    @Test
    void clipsRatiosAtDocumentedBounds() {
        Instances data = fixture();
        data.instance(0).setValue(data.attribute("BILL_AMT1"), 9000);
        Instances out = engineer.run(data);
        assertEquals(5, value(out, FeatureEngineer.F_UTILIZATION_1), 1e-9);
    }

    private static double value(Instances data, String attribute) {
        return data.instance(0).value(data.attribute(attribute));
    }

    private static Instances fixture() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("LIMIT_BAL"));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("PAY_" + month));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("BILL_AMT" + month));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("PAY_AMT" + month));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances data = new Instances("fixture", attributes, 1);
        data.setClassIndex(data.numAttributes() - 1);
        data.add(new DenseInstance(1, new double[]{
                1000,
                2, 0, -1, 1, -2, 0,
                500, 400, 300, 200, 100, -100,
                100, 100, 100, 100, 100, 100,
                0
        }));
        return data;
    }
}
