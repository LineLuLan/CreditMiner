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
 * Tests for {@link Preprocessor}. Build small in-memory {@link Instances}
 * to exercise filters without depending on Phase-1 ARFF files.
 */
class PreprocessorTest {

    private final Preprocessor preprocessor = new Preprocessor();

    @Test
    void contextLoads() {
        assertNotNull(preprocessor);
    }

    @Test
    void normalizeKeepsValuesIn01() {
        Attribute x = new Attribute("x");
        ArrayList<Attribute> attrs = new ArrayList<>(List.of(x));
        Instances data = new Instances("t", attrs, 0);
        for (double v : new double[] { 0, 5, 10, 25, 50 }) {
            data.add(new DenseInstance(1.0, new double[] { v }));
        }
        Instances normalized = preprocessor.normalize(data);
        for (int i = 0; i < normalized.numInstances(); i++) {
            double v = normalized.instance(i).value(0);
            assertTrue(v >= 0 && v <= 1, "Normalized value out of [0,1]: " + v);
        }
        // Endpoints should map exactly to 0 and 1
        assertEquals(0.0, normalized.instance(0).value(0), 1e-9);
        assertEquals(1.0, normalized.instance(4).value(0), 1e-9);
    }

    @Test
    void imputeMissingRewritesUnknownToMode() {
        // Use a real BE column name from CATEGORICAL_UNKNOWN_COLS so the rewrite fires.
        ArrayList<String> levels = new ArrayList<>(List.of("Graduate", "College", "Unknown"));
        Attribute edu = new Attribute("Education_Level", levels);
        Instances data = new Instances("t", new ArrayList<>(List.of(edu)), 0);
        addNominal(data, edu, "Graduate");
        addNominal(data, edu, "Graduate");
        addNominal(data, edu, "Graduate");
        addNominal(data, edu, "College");
        addNominal(data, edu, "Unknown");

        Instances out = preprocessor.imputeMissing(data);
        Attribute outAttr = out.attribute("Education_Level");
        // Last row had "Unknown" → rewritten to missing → ReplaceMissingValues fills with mode (Graduate).
        assertEquals("Graduate", outAttr.value((int) out.instance(4).value(outAttr)));
    }

    private static void addNominal(Instances data, Attribute attr, String value) {
        DenseInstance inst = new DenseInstance(1.0, new double[] { attr.indexOfValue(value) });
        data.add(inst);
    }
}
