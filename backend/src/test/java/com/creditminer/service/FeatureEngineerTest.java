package com.creditminer.service;

import org.junit.jupiter.api.Test;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests for {@link FeatureEngineer}. The leakage guard is the most important —
 * Risk_Score and Customer_Value_Score must never depend on Attrition_Flag.
 */
class FeatureEngineerTest {

    private final FeatureEngineer fe = new FeatureEngineer();

    @Test
    void contextLoads() {
        assertNotNull(fe);
    }

    @Test
    void noTargetLeakage() {
        Instances existing = baseDataset("Existing Customer");
        Instances attrited = baseDataset("Attrited Customer");

        Instances outA = fe.run(existing);
        Instances outB = fe.run(attrited);

        Attribute riskA = outA.attribute(FeatureEngineer.F_RISK);
        Attribute riskB = outB.attribute(FeatureEngineer.F_RISK);
        Attribute valA = outA.attribute(FeatureEngineer.F_VALUE);
        Attribute valB = outB.attribute(FeatureEngineer.F_VALUE);

        assertNotNull(riskA);
        assertNotNull(valA);
        for (int i = 0; i < outA.numInstances(); i++) {
            assertEquals(outA.instance(i).value(riskA), outB.instance(i).value(riskB), 1e-9,
                    "Risk_Score row " + i + " differs after toggling Attrition_Flag");
            assertEquals(outA.instance(i).value(valA), outB.instance(i).value(valB), 1e-9,
                    "Customer_Value_Score row " + i + " differs after toggling Attrition_Flag");
        }
    }

    @Test
    void spendingIntensityHandlesZeroTransactionCount() {
        Instances data = baseDataset("Existing Customer");
        // Force the first row's Total_Trans_Ct to 0
        Attribute ct = data.attribute("Total_Trans_Ct");
        data.instance(0).setValue(ct, 0);

        Instances out = fe.run(data);
        Attribute si = out.attribute(FeatureEngineer.F_SPENDING);
        double v = out.instance(0).value(si);
        assertTrue(Double.isFinite(v), "Spending_Intensity must not be NaN/Inf when Total_Trans_Ct=0");
    }

    /**
     * Build a dataset with the columns FeatureEngineer needs to compute all 6
     * derived features. Three rows with deliberately different magnitudes so the
     * z-scores in Customer_Value_Score don't collapse.
     */
    private static Instances baseDataset(String attritionLabel) {
        ArrayList<Attribute> attrs = new ArrayList<>();
        attrs.add(new Attribute("Attrition_Flag",
                new ArrayList<>(List.of("Existing Customer", "Attrited Customer"))));
        attrs.add(new Attribute("Customer_Age"));
        attrs.add(new Attribute("Months_on_book"));
        attrs.add(new Attribute("Months_Inactive_12_mon"));
        attrs.add(new Attribute("Credit_Limit"));
        attrs.add(new Attribute("Total_Revolving_Bal"));
        attrs.add(new Attribute("Total_Trans_Amt"));
        attrs.add(new Attribute("Total_Trans_Ct"));
        attrs.add(new Attribute("Avg_Utilization_Ratio"));
        Instances data = new Instances("fixture", attrs, 0);
        data.setClassIndex(0);

        addRow(data, attritionLabel, 35, 24, 1, 5000, 800, 3000, 40, 0.16);
        addRow(data, attritionLabel, 50, 48, 4, 20000, 2500, 12000, 90, 0.125);
        addRow(data, attritionLabel, 60, 60, 0, 8000, 1200, 6000, 65, 0.15);
        return data;
    }

    private static void addRow(Instances data, String attrition, double age, double monthsBook,
                               double inactive, double creditLimit, double revBal,
                               double transAmt, double transCt, double avgUtil) {
        double attritionIdx = data.attribute("Attrition_Flag").indexOfValue(attrition);
        data.add(new DenseInstance(1.0, new double[] {
                attritionIdx, age, monthsBook, inactive, creditLimit, revBal, transAmt, transCt, avgUtil
        }));
    }
}
