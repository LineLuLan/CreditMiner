package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Add;

/** Phase 3 credit-risk features derived only from predictor columns. */
@Slf4j
@Service
public class FeatureEngineer {

    public static final String F_UTILIZATION_1 = "UTILIZATION_1";
    public static final String F_AVG_UTILIZATION = "AVG_UTILIZATION";
    public static final String F_PAY_RATIO = "PAY_RATIO";
    public static final String F_MONTHS_DELAYED = "MONTHS_DELAYED";
    public static final String F_MAX_DELAY = "MAX_DELAY";
    public static final String F_BILL_TREND = "BILL_TREND";
    public static final String F_RISK_TIER = "RISK_TIER";
    public static final String[] RISK_TIER_LABELS = {"Low", "Medium", "High"};

    public Instances run(Instances data) {
        log.info("FeatureEngineer.run() - adding 7 credit-risk features");
        Instances out = new Instances(data);
        out = utilization1(out);
        out = averageUtilization(out);
        out = payRatio(out);
        out = monthsDelayed(out);
        out = maxDelay(out);
        out = billTrend(out);
        out = riskTier(out);
        return out;
    }

    public Instances utilization1(Instances data) {
        Attribute bill = require(data, "BILL_AMT1");
        Attribute limit = require(data, "LIMIT_BAL");
        return appendNumeric(data, F_UTILIZATION_1,
                row -> clip(safeDivide(row.value(bill), row.value(limit)), -1, 5));
    }

    public Instances averageUtilization(Instances data) {
        Attribute limit = require(data, "LIMIT_BAL");
        Attribute[] bills = attributes(data, "BILL_AMT", 6);
        return appendNumeric(data, F_AVG_UTILIZATION, row -> {
            double sum = 0;
            for (Attribute bill : bills) sum += safeDivide(row.value(bill), row.value(limit));
            return clip(sum / bills.length, -1, 5);
        });
    }

    public Instances payRatio(Instances data) {
        Attribute[] bills = attributes(data, "BILL_AMT", 6);
        Attribute[] payments = attributes(data, "PAY_AMT", 6);
        return appendNumeric(data, F_PAY_RATIO, row -> {
            double positiveBills = 0;
            double paid = 0;
            for (Attribute bill : bills) positiveBills += Math.max(0, row.value(bill));
            for (Attribute payment : payments) paid += row.value(payment);
            return clip(paid / Math.max(1, positiveBills), 0, 5);
        });
    }

    public Instances monthsDelayed(Instances data) {
        Attribute[] statuses = attributes(data, "PAY_", 6);
        return appendNumeric(data, F_MONTHS_DELAYED, row -> {
            int count = 0;
            for (Attribute status : statuses) if (row.value(status) >= 1) count++;
            return count;
        });
    }

    public Instances maxDelay(Instances data) {
        Attribute[] statuses = attributes(data, "PAY_", 6);
        return appendNumeric(data, F_MAX_DELAY, row -> {
            double max = Double.NEGATIVE_INFINITY;
            for (Attribute status : statuses) max = Math.max(max, row.value(status));
            return max;
        });
    }

    public Instances billTrend(Instances data) {
        Attribute newest = require(data, "BILL_AMT1");
        Attribute oldest = require(data, "BILL_AMT6");
        Attribute limit = require(data, "LIMIT_BAL");
        return appendNumeric(data, F_BILL_TREND, row -> clip(
                safeDivide(row.value(newest) - row.value(oldest), row.value(limit)), -5, 5));
    }

    /**
     * High: delay of two or more months, at least two delayed months, or average utilization >= 1.
     * Low: no delayed months and average utilization < 0.5. All other rows are Medium.
     */
    public Instances riskTier(Instances data) {
        Attribute averageUtilization = require(data, F_AVG_UTILIZATION);
        Attribute monthsDelayed = require(data, F_MONTHS_DELAYED);
        Attribute maxDelay = require(data, F_MAX_DELAY);
        Instances out = appendNominal(data, F_RISK_TIER, String.join(",", RISK_TIER_LABELS));
        Attribute tier = out.attribute(F_RISK_TIER);
        Attribute averageOut = out.attribute(averageUtilization.name());
        Attribute monthsOut = out.attribute(monthsDelayed.name());
        Attribute maxOut = out.attribute(maxDelay.name());
        for (int i = 0; i < out.numInstances(); i++) {
            Instance row = out.instance(i);
            String label;
            if (row.value(maxOut) >= 2 || row.value(monthsOut) >= 2 || row.value(averageOut) >= 1) {
                label = "High";
            } else if (row.value(monthsOut) == 0 && row.value(averageOut) < 0.5) {
                label = "Low";
            } else {
                label = "Medium";
            }
            row.setValue(tier, label);
        }
        return out;
    }

    @FunctionalInterface
    private interface InstanceFunction {
        double apply(Instance instance);
    }

    private static Instances appendNumeric(Instances data, String name, InstanceFunction function) {
        try {
            Add add = new Add();
            add.setAttributeName(name);
            add.setAttributeIndex("last");
            add.setInputFormat(data);
            Instances out = Filter.useFilter(data, add);
            Attribute target = out.attribute(name);
            for (int i = 0; i < out.numInstances(); i++) {
                out.instance(i).setValue(target, function.apply(out.instance(i)));
            }
            return out;
        } catch (Exception e) {
            throw new IllegalStateException("Could not add feature " + name, e);
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
            throw new IllegalStateException("Could not add feature " + name, e);
        }
    }

    private static Attribute[] attributes(Instances data, String prefix, int count) {
        Attribute[] result = new Attribute[count];
        for (int i = 0; i < count; i++) result[i] = require(data, prefix + (i + 1));
        return result;
    }

    private static Attribute require(Instances data, String name) {
        Attribute attribute = data.attribute(name);
        if (attribute == null) throw new IllegalStateException("Required attribute missing: " + name);
        return attribute;
    }

    private static double safeDivide(double numerator, double denominator) {
        if (!Double.isFinite(numerator) || !Double.isFinite(denominator) || denominator == 0) return 0;
        return numerator / denominator;
    }

    private static double clip(double value, double minimum, double maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
}
