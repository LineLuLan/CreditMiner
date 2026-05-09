package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.associations.Apriori;
import weka.core.Attribute;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Discretize;
import weka.filters.unsupervised.attribute.Remove;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Phase 7 — Apriori association rule mining (BE-70..BE-74).
 *
 * <p>Pipeline:
 * <ol>
 *   <li>{@link #discretizeForApriori(Instances)} — 3 equal-frequency bins on 6 numeric cols</li>
 *   <li>Drop unused attributes outside the Apriori input set</li>
 *   <li>{@link #runApriori(Instances)} — sup=0.05, conf=0.7, n=50</li>
 *   <li>{@link #extractRules(Apriori, int, double)} — keep rules with {@code Attrition_Flag} on RHS,
 *       {@code lift > minLift}, sort by lift desc, categorize as {@code churn|retention}</li>
 * </ol>
 * </p>
 */
@Slf4j
@Service
public class AssociationService {

    /** Numeric cols discretized into 3 equal-frequency bins (blueprint §7.1). */
    public static final List<String> NUMERIC_TO_DISCRETIZE = List.of(
            "Credit_Limit", "Avg_Utilization_Ratio", "Total_Trans_Amt",
            "Total_Trans_Ct", "Risk_Score", "Months_Inactive_12_mon"
    );

    /** Attributes kept on the Apriori input set (everything else is dropped). */
    public static final List<String> APRIORI_KEEP = List.of(
            // Discretized numerics (now nominal)
            "Credit_Limit", "Avg_Utilization_Ratio", "Total_Trans_Amt",
            "Total_Trans_Ct", "Risk_Score", "Months_Inactive_12_mon",
            // Native nominals
            "Income_Category", "Card_Category", "Customer_Tier",
            "Gender", "Education_Level", "Marital_Status",
            "Attrition_Flag"
    );

    private static final double MIN_SUPPORT = 0.05;
    private static final double MIN_CONFIDENCE = 0.7;
    /**
     * Apriori in Weka stops decrementing support once {@code numRules} rules have been
     * found at the current support floor. With Attrited at only 16% prevalence we need
     * support to actually descend to 5% — so bump this far above the post-filter target
     * (we trim back to the top 50 by lift after extraction).
     */
    private static final int NUM_RULES = 10000;
    private static final double DELTA = 0.01;
    private static final int FINAL_TOP_N = 50;

    /** Regex for one rule line in {@link Apriori#toString()} output. */
    private static final Pattern RULE_LINE = Pattern.compile(
            "^\\s*\\d+\\.\\s+(.+?)\\s+(\\d+)\\s+==>\\s+(.+?)\\s+(\\d+)\\s+<conf:\\(([0-9.]+)\\)>\\s+lift:\\(([0-9.]+)\\).*$"
    );

    /** Discretize the 6 numeric columns from {@link #NUMERIC_TO_DISCRETIZE} (3 bins, equal-frequency). */
    public Instances discretizeForApriori(Instances data) {
        try {
            int[] indices = indicesOf(data, NUMERIC_TO_DISCRETIZE);
            if (indices.length == 0) {
                log.warn("No numeric columns matched discretization list");
                return data;
            }
            Discretize disc = new Discretize();
            disc.setBins(3);
            disc.setUseEqualFrequency(true);
            disc.setAttributeIndicesArray(indices);
            disc.setInputFormat(data);
            Instances out = Filter.useFilter(data, disc);
            log.info("Discretized {} numeric cols into 3 equal-frequency bins", indices.length);
            return out;
        } catch (Exception e) {
            throw new IllegalStateException("Discretize filter failed", e);
        }
    }

    /** Drop every attribute NOT in {@link #APRIORI_KEEP}. */
    public Instances retainKeepCols(Instances data) {
        try {
            List<Integer> drops = new ArrayList<>();
            for (int i = 0; i < data.numAttributes(); i++) {
                if (!APRIORI_KEEP.contains(data.attribute(i).name())) drops.add(i);
            }
            if (drops.isEmpty()) return data;
            Remove rm = new Remove();
            rm.setAttributeIndicesArray(drops.stream().mapToInt(Integer::intValue).toArray());
            rm.setInputFormat(data);
            Instances out = Filter.useFilter(data, rm);
            log.info("Apriori input attrs: {}", listAttrs(out));
            return out;
        } catch (Exception e) {
            throw new IllegalStateException("Remove filter failed", e);
        }
    }

    /** Run Apriori with {sup ≥ 0.05, conf ≥ 0.7}; top-50 trimming happens in {@link #extractRules}. */
    public Apriori runApriori(Instances data) throws Exception {
        Apriori a = new Apriori();
        a.setLowerBoundMinSupport(MIN_SUPPORT);
        a.setUpperBoundMinSupport(1.0);
        a.setDelta(DELTA);
        a.setMinMetric(MIN_CONFIDENCE);
        a.setNumRules(NUM_RULES);
        a.setOutputItemSets(false);
        a.buildAssociations(data);
        return a;
    }

    /**
     * Extract rules from {@link Apriori#toString()} output, filter to
     * {@code Attrition_Flag} on RHS with {@code lift > minLift}, sort by lift desc,
     * categorize churn vs retention.
     */
    public List<RuleRecord> extractRules(Apriori apriori, int totalInstances, double minLift) {
        String output = apriori.toString();
        List<RuleRecord> rules = new ArrayList<>();
        for (String line : output.split("\\R")) {
            Matcher m = RULE_LINE.matcher(line);
            if (!m.find()) continue;
            String lhs = m.group(1).trim();
            String rhs = m.group(3).trim();
            int jointCount = Integer.parseInt(m.group(4));
            double conf = Double.parseDouble(m.group(5));
            double lift = Double.parseDouble(m.group(6));

            // Phase 7 step 7.3: only single-attribute RHS = Attrition_Flag=...
            // (multi-attr consequences like "Attrition_Flag=X Card_Category=Y" inflate lift artificially).
            String prettyRhs = prettyJoin(rhs);
            if (!prettyRhs.startsWith("Attrition_Flag=")) continue;
            if (prettyRhs.contains(", ")) continue;
            if (lift <= minLift) continue;

            double support = totalInstances == 0 ? 0.0 : (double) jointCount / totalInstances;
            String category = prettyRhs.contains("Attrited") ? "churn"
                    : prettyRhs.contains("Existing") ? "retention"
                    : "other";

            rules.add(new RuleRecord(
                    prettyJoin(lhs), prettyRhs,
                    round(support, 4), round(conf, 4), round(lift, 4),
                    category));
        }
        rules.sort(Comparator.comparingDouble(RuleRecord::lift).reversed());
        if (rules.size() > FINAL_TOP_N) {
            rules = new ArrayList<>(rules.subList(0, FINAL_TOP_N));
        }
        log.info("Extracted {} rules with Attrition_Flag on RHS, lift > {}", rules.size(), minLift);
        return rules;
    }

    // -------------------- helpers --------------------

    /** Convert space-separated Apriori items into "item1, item2, item3" for readability. */
    private static String prettyJoin(String raw) {
        // Apriori item-set format = "Attr1=Val1 Attr2=Val2". We want "Attr1=Val1, Attr2=Val2".
        // Split on " " followed by capital-letter word and "=" (best-effort heuristic).
        return raw.replaceAll("\\s+(?=[A-Za-z][A-Za-z0-9_]*=)", ", ").trim();
    }

    private static int[] indicesOf(Instances data, List<String> names) {
        List<Integer> idxs = new ArrayList<>();
        for (String n : names) {
            Attribute a = data.attribute(n);
            if (a != null && a.isNumeric()) idxs.add(a.index() + 1); // Discretize uses 1-based
        }
        return idxs.stream().mapToInt(i -> i - 1).toArray();
    }

    private static String listAttrs(Instances data) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < data.numAttributes(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(data.attribute(i).name());
        }
        return sb.append("]").toString();
    }

    private static double round(double v, int decimals) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        double f = Math.pow(10, decimals);
        return Math.round(v * f) / f;
    }

    /** Lightweight in-memory record passed to JSON exporter / repo. */
    public record RuleRecord(String lhs, String rhs, double support,
                             double confidence, double lift, String category) { }
}
