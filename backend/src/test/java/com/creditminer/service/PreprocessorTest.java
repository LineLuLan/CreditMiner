package com.creditminer.service;

import org.junit.jupiter.api.Test;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PreprocessorTest {

    @Test
    void duplicatesIgnoreIdAndNegativeBillsArePreservedAndCounted() {
        Instances data = fixture();
        add(data, 1, -20, 100, "No");
        add(data, 2, -20, 100, "No");
        add(data, 3, 40, 300, "Yes");

        Preprocessor preprocessor = new Preprocessor();
        Instances cleaned = preprocessor.run(data);

        assertEquals(2, cleaned.numInstances());
        assertEquals(1, preprocessor.getLastReport().duplicatesDropped);
        assertEquals(1, preprocessor.getLastReport().negativeBillTotal);
        assertEquals(1, preprocessor.getLastReport().negativeBillByColumn.get("BILL_AMT1"));
        assertEquals(-20, cleaned.instance(0).value(cleaned.attribute("BILL_AMT1")));
    }

    @Test
    void iqrOutliersAreFlaggedButNotDeleted() {
        Instances data = fixture();
        for (int i = 0; i < 8; i++) add(data, i + 1, 10, 100 + i, "No");
        add(data, 9, 10000, 108, "Yes");

        Preprocessor preprocessor = new Preprocessor();
        Instances cleaned = preprocessor.run(data);

        assertEquals(9, cleaned.numInstances());
        assertTrue(preprocessor.getLastOutlierFlags()[8]);
        assertTrue(preprocessor.getLastReport().outlierByColumn.get("BILL_AMT1").iqrCount() > 0);
    }

    private static Instances fixture() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("ID"));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("BILL_AMT" + month));
        attributes.add(new Attribute("AGE"));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances data = new Instances("fixture", attributes, 0);
        data.setClassIndex(data.numAttributes() - 1);
        return data;
    }

    private static void add(Instances data, double id, double firstBill, double age, String target) {
        double[] values = {id, firstBill, 0, 0, 0, 0, 0, age,
                data.classAttribute().indexOfValue(target)};
        data.add(new DenseInstance(1, values));
    }
}
