package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Add;

import java.util.Arrays;

/**
 * Phase 3 — 6 derived features per blueprint §3.
 *
 * <p>Order matters: tier depends on Customer_Value_Score; Risk_Score depends on
 * Utilization_Score + Engagement_Score.</p>
 *
 * <p>⚠ Customer_Value_Score and Risk_Score MUST NOT use {@code Attrition_Flag}
 * as input (data leakage rule).</p>
 */
@Slf4j
@Service
public class FeatureEngineer {

    public static final String F_UTILIZATION = "Utilization_Score";
    public static final String F_SPENDING = "Spending_Intensity";
    public static final String F_ENGAGEMENT = "Engagement_Score";
    public static final String F_VALUE = "Customer_Value_Score";
    public static final String F_RISK = "Risk_Score";
    public static final String F_TIER = "Customer_Tier";

    public static final String[] TIER_LABELS = { "Bronze", "Silver", "Gold", "Platinum" };

    /** Master entry — applies all 6 features in dependency order. */
    public Instances run(Instances data) {
        log.info("FeatureEngineer.run() — adding 6 derived features");
        Instances out = new Instances(data);
        out = utilizationScore(out);
        out = spendingIntensity(out);
        out = engagementScore(out);
        out = customerValueScore(out);
        out = riskScore(out);
        out = customerTier(out);
        log.info("FeatureEngineer.run() — done. {} columns total", out.numAttributes());
        return out;
    }

    public Instances utilizationScore(Instances data) {
        Attribute bal = req(data, "Total_Revolving_Bal");
        Attribute lim = req(data, "Credit_Limit");
        return appendNumeric(data, F_UTILIZATION, inst ->
                safeDivide(inst.value(bal), inst.value(lim)));
    }

    public Instances spendingIntensity(Instances data) {
        Attribute amt = req(data, "Total_Trans_Amt");
        Attribute ct = req(data, "Total_Trans_Ct");
        return appendNumeric(data, F_SPENDING, inst ->
                safeDivide(inst.value(amt), inst.value(ct)));
    }

    public Instances engagementScore(Instances data) {
        Attribute ct = req(data, "Total_Trans_Ct");
        Attribute months = req(data, "Months_on_book");
        return appendNumeric(data, F_ENGAGEMENT, inst ->
                safeDivide(inst.value(ct), inst.value(months)));
    }

    /**
     * Composite z-score (NO Attrition_Flag — verified by test):
     * 0.4·z(Total_Trans_Amt) + 0.3·z(Credit_Limit)
     *  + 0.2·z(Months_on_book) − 0.1·z(Months_Inactive_12_mon).
     */
    public Instances customerValueScore(Instances data) {
        double[] mAmt = meanStd(data, "Total_Trans_Amt");
        double[] mLim = meanStd(data, "Credit_Limit");
        double[] mTen = meanStd(data, "Months_on_book");
        double[] mInact = meanStd(data, "Months_Inactive_12_mon");
        Attribute amt = req(data, "Total_Trans_Amt");
        Attribute lim = req(data, "Credit_Limit");
        Attribute ten = req(data, "Months_on_book");
        Attribute inact = req(data, "Months_Inactive_12_mon");
        return appendNumeric(data, F_VALUE, inst ->
                0.4 * z(inst.value(amt), mAmt)
                        + 0.3 * z(inst.value(lim), mLim)
                        + 0.2 * z(inst.value(ten), mTen)
                        - 0.1 * z(inst.value(inact), mInact));
    }

    /**
     * Risk_Score = 0.4·Utilization_Score + 0.3·(Inactive/12) + 0.3·(1 − Engagement_norm).
     * Engagement_norm is min-max normalized {@code Engagement_Score}.
     */
    public Instances riskScore(Instances data) {
        Attribute util = req(data, F_UTILIZATION);
        Attribute eng = req(data, F_ENGAGEMENT);
        Attribute inact = req(data, "Months_Inactive_12_mon");
        double[] vals = data.attributeToDoubleArray(eng.index());
        double engMin = Arrays.stream(vals).filter(v -> !Double.isNaN(v)).min().orElse(0);
        double engMax = Arrays.stream(vals).filter(v -> !Double.isNaN(v)).max().orElse(1);
        double range = engMax - engMin;
        return appendNumeric(data, F_RISK, inst -> {
            double engNorm = range == 0 ? 0 : (inst.value(eng) - engMin) / range;
            return 0.4 * inst.value(util)
                    + 0.3 * (inst.value(inact) / 12.0)
                    + 0.3 * (1.0 - engNorm);
        });
    }

    /** Quartile-bin Customer_Value_Score → {Bronze, Silver, Gold, Platinum}. */
    public Instances customerTier(Instances data) {
        Attribute value = req(data, F_VALUE);
        double[] sorted = Arrays.stream(data.attributeToDoubleArray(value.index()))
                .filter(v -> !Double.isNaN(v))
                .sorted()
                .toArray();
        double q1 = percentile(sorted, 0.25);
        double q2 = percentile(sorted, 0.50);
        double q3 = percentile(sorted, 0.75);
        log.info("Customer_Tier quartile cutoffs: Q1={}, Q2={}, Q3={}", q1, q2, q3);

        Instances out = appendNominal(data, F_TIER, String.join(",", TIER_LABELS));
        Attribute tierAttr = out.attribute(F_TIER);
        Attribute valueOut = out.attribute(F_VALUE);
        for (int i = 0; i < out.numInstances(); i++) {
            double v = out.instance(i).value(valueOut);
            int bin = v < q1 ? 0 : v < q2 ? 1 : v < q3 ? 2 : 3;
            out.instance(i).setValue(tierAttr, bin);
        }
        return out;
    }

    // -------------------- helpers --------------------

    @FunctionalInterface
    private interface InstanceFn { double apply(Instance inst); }

    private static Instances appendNumeric(Instances data, String name, InstanceFn fn) {
        try {
            Add add = new Add();
            add.setAttributeName(name);
            add.setAttributeIndex("last");
            add.setInputFormat(data);
            Instances out = Filter.useFilter(data, add);
            int idx = out.numAttributes() - 1;
            for (int i = 0; i < out.numInstances(); i++) {
                out.instance(i).setValue(idx, fn.apply(out.instance(i)));
            }
            return out;
        } catch (Exception e) {
            throw new IllegalStateException("Add filter failed for " + name, e);
        }
    }

    private static Instances appendNominal(Instances data, String name, String labels) {
        try {
            Add add = new Add();
            add.setAttributeName(name);
            add.setNominalLabels(labels);
            add.setAttributeIndex("last");
            add.setInputFormat(data);
            return Filter.useFilter(data, add);
        } catch (Exception e) {
            throw new IllegalStateException("Add filter failed for " + name, e);
        }
    }

    private static Attribute req(Instances data, String name) {
        Attribute a = data.attribute(name);
        if (a == null) throw new IllegalStateException("Required attribute missing: " + name);
        return a;
    }

    private static double safeDivide(double num, double den) {
        if (Double.isNaN(num) || Double.isNaN(den) || den == 0) return 0;
        return num / den;
    }

    /** Returns {mean, stdDev} for a numeric column, NaNs ignored. stdDev is sample (n-1). */
    private static double[] meanStd(Instances data, String name) {
        Attribute a = req(data, name);
        double[] vals = data.attributeToDoubleArray(a.index());
        double sum = 0; int n = 0;
        for (double v : vals) if (!Double.isNaN(v)) { sum += v; n++; }
        if (n == 0) return new double[] { 0, 0 };
        double mean = sum / n;
        double ss = 0;
        for (double v : vals) if (!Double.isNaN(v)) ss += (v - mean) * (v - mean);
        double std = n < 2 ? 0 : Math.sqrt(ss / (n - 1));
        return new double[] { mean, std };
    }

    private static double z(double v, double[] meanStd) {
        if (Double.isNaN(v) || meanStd[1] == 0) return 0;
        return (v - meanStd[0]) / meanStd[1];
    }

    /** Linear-interpolated percentile (numpy default). Assumes sorted, no NaNs. */
    private static double percentile(double[] sorted, double p) {
        if (sorted.length == 0) return Double.NaN;
        double pos = p * (sorted.length - 1);
        int lo = (int) Math.floor(pos);
        int hi = (int) Math.ceil(pos);
        if (lo == hi) return sorted[lo];
        return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
    }
}
