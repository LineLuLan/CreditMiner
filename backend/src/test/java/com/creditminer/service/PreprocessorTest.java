package com.creditminer.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Stub tests for {@link Preprocessor}. Enable as methods are implemented.
 */
class PreprocessorTest {

    private final Preprocessor preprocessor = new Preprocessor();

    @Test
    void contextLoads() {
        assertNotNull(preprocessor);
    }

    @Test
    @Disabled("TODO: enable after BE-20 (mode/median imputation)")
    void imputesMissingCategoricalsWithMode() {
        // given: instances with "Unknown" in Education_Level
        // when: imputeMissing()
        // then: "Unknown" replaced with the modal value
    }

    @Test
    @Disabled("TODO: enable after BE-22/BE-23 (z-score + IQR flagging)")
    void flagsOutliersWithoutDeleting() {
        // given: instances with extreme Credit_Limit
        // when: flagOutliers()
        // then: row count unchanged, is_outlier set true for extremes
    }

    @Test
    @Disabled("TODO: enable after BE-24 (min-max normalize)")
    void normalizeProducesValuesIn01() {
        // given: arbitrary numeric instances
        // when: normalize()
        // then: every numeric attribute is within [0,1]
    }
}
