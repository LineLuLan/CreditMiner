package com.creditminer.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Stub tests for {@link FeatureEngineer}. The {@link #noTargetLeakage()} test
 * is the most important of the suite — it guards Risk_Score and Customer_Value_Score
 * against accidentally consuming Attrition_Flag.
 */
class FeatureEngineerTest {

    private final FeatureEngineer fe = new FeatureEngineer();

    @Test
    void contextLoads() {
        assertNotNull(fe);
    }

    @Test
    @Disabled("TODO: enable after BE-33/BE-34 (composite scores)")
    void noTargetLeakage() {
        // given: instances WITHOUT Attrition_Flag column
        // when: customerValueScore() and riskScore()
        // then: produces valid output (proves they don't reach for the target)
    }

    @Test
    @Disabled("TODO: enable after BE-35 (quartiles -> Bronze/Silver/Gold/Platinum)")
    void customerTierProducesFourCategories() { }

    @Test
    @Disabled("TODO: enable after BE-31")
    void spendingIntensityHandlesZeroTransactionCount() {
        // edge case: Total_Trans_Ct = 0 must not produce NaN/Inf
    }
}
