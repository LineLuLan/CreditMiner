package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Instances;

/**
 * Phase 3 — adds 6 derived features per blueprint §3.
 *
 * <p>⚠ Risk_Score and Customer_Value_Score MUST NOT use {@code Attrition_Flag}
 * — verified in unit test {@code FeatureEngineerTest#noTargetLeakage()}.</p>
 *
 * <p>The order matters: tier comes last because it depends on
 * {@code Customer_Value_Score}.</p>
 */
@Slf4j
@Service
public class FeatureEngineer {

    /** Master entry point — applies all 6 features in order. */
    public Instances run(Instances data) {
        log.info("FeatureEngineer.run() — adding 6 derived features");
        Instances out = data;
        out = utilizationScore(out);
        out = spendingIntensity(out);
        out = engagementScore(out);
        out = customerValueScore(out);
        out = riskScore(out);
        out = customerTier(out);
        return out;
    }

    /** {@code Utilization_Score = Total_Revolving_Bal / Credit_Limit}. */
    public Instances utilizationScore(Instances data) {
        // TODO: AddExpression filter or manual attribute insert
        return data;
    }

    /** {@code Spending_Intensity = Total_Trans_Amt / Total_Trans_Ct} (avoid /0). */
    public Instances spendingIntensity(Instances data) {
        // TODO
        return data;
    }

    /** {@code Engagement_Score = Total_Trans_Ct / Months_on_book}. */
    public Instances engagementScore(Instances data) {
        // TODO
        return data;
    }

    /**
     * Composite z-score: {@code 0.4·z(TransAmt) + 0.3·z(CreditLim)
     * + 0.2·z(Tenure) − 0.1·z(Inactive)}.
     */
    public Instances customerValueScore(Instances data) {
        // TODO
        return data;
    }

    /**
     * {@code Risk_Score = 0.4·Util + 0.3·(Inactive/12)
     * + 0.3·(1 − Engagement_norm)}.
     *
     * <p>Engagement_norm is the min-max normalized {@code Engagement_Score}.</p>
     */
    public Instances riskScore(Instances data) {
        // TODO
        return data;
    }

    /** Discretize {@code Customer_Value_Score} into Bronze/Silver/Gold/Platinum (quartiles). */
    public Instances customerTier(Instances data) {
        // TODO: weka.filters.unsupervised.attribute.Discretize then map labels
        return data;
    }
}
