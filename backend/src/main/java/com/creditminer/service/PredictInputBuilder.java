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
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;

import java.io.File;

/** Builds prediction rows with exactly the same raw and derived attributes used for training. */
@Slf4j
@Service
@RequiredArgsConstructor
public class PredictInputBuilder {

    @Value("${creditminer.data.enriched-arff}")
    private String enrichedArffPath;

    private final DataLoader dataLoader;
    private Instances template;

    @PostConstruct
    public void init() {
        try {
            File file = new File(enrichedArffPath);
            if (!file.exists()) {
                log.warn("Prediction template missing at {}; inference is unavailable", enrichedArffPath);
                return;
            }
            Instances full = dataLoader.loadArff(enrichedArffPath);
            Attribute id = full.attribute("ID");
            if (id != null) {
                Remove remove = new Remove();
                remove.setAttributeIndicesArray(new int[] {id.index()});
                remove.setInputFormat(full);
                full = Filter.useFilter(full, remove);
            }
            Attribute target = full.attribute("Default");
            if (target == null) {
                throw new IllegalStateException("Default class attribute is missing");
            }
            full.setClassIndex(target.index());
            template = new Instances(full, 0);
            template.setClassIndex(target.index());
            log.info("PredictInputBuilder ready with {} attributes", template.numAttributes());
        } catch (Exception ex) {
            template = null;
            log.error("Failed to initialize PredictInputBuilder", ex);
        }
    }

    public boolean isReady() {
        return template != null;
    }

    public Instance build(PredictRequest request) {
        if (!isReady()) {
            throw new IllegalStateException("PredictInputBuilder not initialized");
        }
        Instance row = new DenseInstance(template.numAttributes());
        row.setDataset(template);
        setMissing(row, "Default");
        setNumeric(row, "LIMIT_BAL", request.getLimitBal());
        setNominal(row, "SEX", request.getSex());
        setNominal(row, "EDUCATION", request.getEducation());
        setNominal(row, "MARRIAGE", request.getMarriage());
        setNumeric(row, "AGE", request.getAge());

        int[] payStatus = payStatus(request);
        double[] bills = bills(request);
        double[] payments = payments(request);
        for (int month = 0; month < 6; month++) {
            setNumeric(row, "PAY_" + (month + 1), payStatus[month]);
            setNumeric(row, "BILL_AMT" + (month + 1), bills[month]);
            setNumeric(row, "PAY_AMT" + (month + 1), payments[month]);
        }

        EngineeredFeatures features = engineer(request);
        setNumeric(row, "UTILIZATION_1", features.utilization1());
        setNumeric(row, "AVG_UTILIZATION", features.avgUtilization());
        setNumeric(row, "PAY_RATIO", features.payRatio());
        setNumeric(row, "MONTHS_DELAYED", features.monthsDelayed());
        setNumeric(row, "MAX_DELAY", features.maxDelay());
        setNumeric(row, "BILL_TREND", features.billTrend());
        setNominal(row, "RISK_TIER", features.riskTier());
        return row;
    }

    /** Pure feature calculation shared by inference and focused unit tests. */
    public EngineeredFeatures engineer(PredictRequest request) {
        double limit = request.getLimitBal().doubleValue();
        double[] bills = bills(request);
        double[] payments = payments(request);
        int[] status = payStatus(request);

        double utilization1 = clip(bills[0] / limit, -1, 5);
        double utilizationSum = 0;
        double positiveBills = 0;
        double paymentSum = 0;
        int monthsDelayed = 0;
        int maxDelay = Integer.MIN_VALUE;
        for (int i = 0; i < 6; i++) {
            utilizationSum += bills[i] / limit;
            positiveBills += Math.max(0, bills[i]);
            paymentSum += payments[i];
            if (status[i] >= 1) monthsDelayed++;
            maxDelay = Math.max(maxDelay, status[i]);
        }
        double avgUtilization = clip(utilizationSum / 6.0, -1, 5);
        double payRatio = clip(paymentSum / Math.max(1, positiveBills), 0, 5);
        double billTrend = clip((bills[0] - bills[5]) / limit, -5, 5);
        String riskTier = maxDelay >= 2 || monthsDelayed >= 2 || avgUtilization >= 1.0
                ? "High"
                : monthsDelayed == 0 && avgUtilization < 0.5 ? "Low" : "Medium";
        return new EngineeredFeatures(utilization1, avgUtilization, payRatio,
                monthsDelayed, maxDelay, billTrend, riskTier);
    }

    public record EngineeredFeatures(double utilization1, double avgUtilization, double payRatio,
                                     int monthsDelayed, int maxDelay, double billTrend,
                                     String riskTier) {}

    private void setNumeric(Instance row, String name, Number value) {
        Attribute attribute = template.attribute(name);
        if (attribute == null) throw new IllegalStateException("Training attribute missing: " + name);
        row.setValue(attribute, value.doubleValue());
    }

    private void setNominal(Instance row, String name, String value) {
        Attribute attribute = template.attribute(name);
        if (attribute == null) throw new IllegalStateException("Training attribute missing: " + name);
        int index = attribute.indexOfValue(value);
        if (index < 0) throw new IllegalArgumentException("Unsupported " + name + " value: " + value);
        row.setValue(attribute, index);
    }

    private void setMissing(Instance row, String name) {
        Attribute attribute = template.attribute(name);
        if (attribute == null) throw new IllegalStateException("Training attribute missing: " + name);
        row.setMissing(attribute);
    }

    private static int[] payStatus(PredictRequest r) {
        return new int[] {r.getPay1(), r.getPay2(), r.getPay3(), r.getPay4(), r.getPay5(), r.getPay6()};
    }

    private static double[] bills(PredictRequest r) {
        return new double[] {r.getBillAmt1().doubleValue(), r.getBillAmt2().doubleValue(),
                r.getBillAmt3().doubleValue(), r.getBillAmt4().doubleValue(),
                r.getBillAmt5().doubleValue(), r.getBillAmt6().doubleValue()};
    }

    private static double[] payments(PredictRequest r) {
        return new double[] {r.getPayAmt1().doubleValue(), r.getPayAmt2().doubleValue(),
                r.getPayAmt3().doubleValue(), r.getPayAmt4().doubleValue(),
                r.getPayAmt5().doubleValue(), r.getPayAmt6().doubleValue()};
    }

    private static double clip(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
