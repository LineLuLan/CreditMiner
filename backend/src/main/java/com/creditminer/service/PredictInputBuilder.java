package com.creditminer.service;

import com.creditminer.dto.request.PredictRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import java.io.File;
import java.util.Arrays;

/**
 * Builds a Weka {@link Instance} from a {@link PredictRequest} that exactly
 * matches the schema the RandomForest classifier was trained on (Phase 5):
 * 26 attributes (enriched.arff minus CLIENTNUM).
 *
 * <p>The instance template is loaded once at startup from {@code enriched.arff}.
 * Phase 3 derived features (Utilization_Score, Spending_Intensity, Engagement_Score,
 * Customer_Value_Score, Risk_Score, Customer_Tier) are computed at predict time
 * using the same formulas as {@link FeatureEngineer}, with z-score means/stds
 * cached from training data.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PredictInputBuilder {

    @Value("${creditminer.data.enriched-arff}")
    private String enrichedArffPath;

    private final DataLoader dataLoader;

    private Instances template;
    private double[] amtMeanStd;
    private double[] limMeanStd;
    private double[] tenMeanStd;
    private double[] inactMeanStd;
    private double tierQ1;
    private double tierQ2;
    private double tierQ3;

    @PostConstruct
    public void init() {
        try {
            File f = new File(enrichedArffPath);
            if (!f.exists()) {
                log.warn("Predict template missing at {} — /predict will throw MODEL_NOT_LOADED", enrichedArffPath);
                return;
            }
            Instances full = dataLoader.loadArff(enrichedArffPath);
            // Drop CLIENTNUM to match Phase 5 training schema
            int clientIdx = full.attribute("CLIENTNUM") == null ? -1 : full.attribute("CLIENTNUM").index();
            if (clientIdx >= 0) {
                weka.filters.unsupervised.attribute.Remove rm = new weka.filters.unsupervised.attribute.Remove();
                rm.setAttributeIndicesArray(new int[] { clientIdx });
                rm.setInputFormat(full);
                full = weka.filters.Filter.useFilter(full, rm);
            }
            Attribute classAttr = full.attribute("Attrition_Flag");
            if (classAttr != null) full.setClassIndex(classAttr.index());
            this.template = new Instances(full, 0); // empty copy with same structure

            // Precompute z-score stats on the full enriched dataset for Customer_Value_Score formula
            this.amtMeanStd = meanStd(full, "Total_Trans_Amt");
            this.limMeanStd = meanStd(full, "Credit_Limit");
            this.tenMeanStd = meanStd(full, "Months_on_book");
            this.inactMeanStd = meanStd(full, "Months_Inactive_12_mon");

            // Tier quartile cutoffs from Customer_Value_Score
            double[] cvs = Arrays.stream(full.attributeToDoubleArray(full.attribute("Customer_Value_Score").index()))
                    .filter(v -> !Double.isNaN(v))
                    .sorted()
                    .toArray();
            this.tierQ1 = percentile(cvs, 0.25);
            this.tierQ2 = percentile(cvs, 0.50);
            this.tierQ3 = percentile(cvs, 0.75);
            log.info("PredictInputBuilder ready: template {} attrs, tier cutoffs Q1={} Q2={} Q3={}",
                    template.numAttributes(), round(tierQ1), round(tierQ2), round(tierQ3));
        } catch (Exception e) {
            log.error("Failed to initialize PredictInputBuilder", e);
        }
    }

    public boolean isReady() {
        return template != null;
    }

    /** Build a fully-populated {@link Instance} matching the training schema. */
    public Instance build(PredictRequest req) {
        if (!isReady()) throw new IllegalStateException("PredictInputBuilder not initialized");
        Instance inst = new DenseInstance(template.numAttributes());
        inst.setDataset(template);

        setNominal(inst, "Attrition_Flag", null); // class — let model predict
        setNumeric(inst, "Customer_Age", req.getCustomerAge());
        setNominal(inst, "Gender", req.getGender());
        setNumeric(inst, "Dependent_count", req.getDependentCount());
        setNominal(inst, "Education_Level", req.getEducationLevel());
        setNominal(inst, "Marital_Status", req.getMaritalStatus());
        setNominal(inst, "Income_Category", req.getIncomeCategory());
        setNominal(inst, "Card_Category", req.getCardCategory());
        setNumeric(inst, "Months_on_book", req.getMonthsOnBook());
        setNumeric(inst, "Total_Relationship_Count", req.getTotalRelationshipCount());
        setNumeric(inst, "Months_Inactive_12_mon", req.getMonthsInactive12Mon());
        setNumeric(inst, "Contacts_Count_12_mon", req.getContactsCount12Mon());
        double creditLimit = req.getCreditLimit().doubleValue();
        double revolvingBal = req.getTotalRevolvingBal().doubleValue();
        double transAmt = req.getTotalTransAmt().doubleValue();
        int transCt = req.getTotalTransCt();
        double avgUtil = req.getAvgUtilizationRatio().doubleValue();
        double monthsBook = req.getMonthsOnBook();
        double inactive = req.getMonthsInactive12Mon();
        setNumeric(inst, "Credit_Limit", creditLimit);
        setNumeric(inst, "Total_Revolving_Bal", revolvingBal);
        setNumeric(inst, "Avg_Open_To_Buy", creditLimit - revolvingBal);
        // Quarterly change ratios — request DTO doesn't carry these; default to 1.0 (no change).
        // Acceptable proxy for demo; FE form can be extended later if predictive value is needed.
        setNumeric(inst, "Total_Amt_Chng_Q4_Q1", 1.0);
        setNumeric(inst, "Total_Trans_Amt", transAmt);
        setNumeric(inst, "Total_Trans_Ct", transCt);
        setNumeric(inst, "Total_Ct_Chng_Q4_Q1", 1.0);
        setNumeric(inst, "Avg_Utilization_Ratio", avgUtil);

        // Phase 3 derived features
        double utilizationScore = creditLimit == 0 ? 0 : revolvingBal / creditLimit;
        double spendingIntensity = transCt == 0 ? 0 : transAmt / transCt;
        double engagementScore = monthsBook == 0 ? 0 : transCt / monthsBook;
        double customerValueScore = 0.4 * z(transAmt, amtMeanStd)
                + 0.3 * z(creditLimit, limMeanStd)
                + 0.2 * z(monthsBook, tenMeanStd)
                - 0.1 * z(inactive, inactMeanStd);
        double riskScore = 0.4 * utilizationScore
                + 0.3 * (inactive / 12.0)
                + 0.3 * (1.0 - clamp01(engagementScore / 5.0));
        String tier = customerValueScore < tierQ1 ? "Bronze"
                : customerValueScore < tierQ2 ? "Silver"
                : customerValueScore < tierQ3 ? "Gold"
                : "Platinum";

        setNumeric(inst, "Utilization_Score", utilizationScore);
        setNumeric(inst, "Spending_Intensity", spendingIntensity);
        setNumeric(inst, "Engagement_Score", engagementScore);
        setNumeric(inst, "Customer_Value_Score", customerValueScore);
        setNumeric(inst, "Risk_Score", riskScore);
        setNominal(inst, "Customer_Tier", tier);

        return inst;
    }

    /** Computed Risk_Score, exposed to fill the API response without re-deriving. */
    public double computeRiskScore(PredictRequest req) {
        return ((Number) build(req).value(template.attribute("Risk_Score").index())).doubleValue();
    }

    // -------------------- helpers --------------------

    private void setNumeric(Instance inst, String name, Number v) {
        Attribute a = template.attribute(name);
        if (a == null) return;
        if (v == null) inst.setMissing(a);
        else inst.setValue(a, v.doubleValue());
    }

    private void setNominal(Instance inst, String name, String v) {
        Attribute a = template.attribute(name);
        if (a == null) return;
        if (v == null) {
            inst.setMissing(a);
            return;
        }
        int idx = a.indexOfValue(v);
        if (idx < 0) {
            log.warn("Unknown nominal value '{}' for attribute '{}' — using missing", v, name);
            inst.setMissing(a);
        } else {
            inst.setValue(a, idx);
        }
    }

    private static double[] meanStd(Instances data, String name) {
        Attribute a = data.attribute(name);
        if (a == null) return new double[] { 0, 0 };
        double[] vals = data.attributeToDoubleArray(a.index());
        double s = 0; int n = 0;
        for (double v : vals) if (!Double.isNaN(v)) { s += v; n++; }
        if (n == 0) return new double[] { 0, 0 };
        double mean = s / n;
        double ss = 0;
        for (double v : vals) if (!Double.isNaN(v)) ss += (v - mean) * (v - mean);
        double std = n < 2 ? 0 : Math.sqrt(ss / (n - 1));
        return new double[] { mean, std };
    }

    private static double z(double v, double[] meanStd) {
        if (meanStd[1] == 0) return 0;
        return (v - meanStd[0]) / meanStd[1];
    }

    private static double percentile(double[] sorted, double p) {
        if (sorted.length == 0) return Double.NaN;
        double pos = p * (sorted.length - 1);
        int lo = (int) Math.floor(pos);
        int hi = (int) Math.ceil(pos);
        return lo == hi ? sorted[lo] : sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
    }

    private static double clamp01(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

    private static double round(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        return Math.round(v * 10000.0) / 10000.0;
    }
}
