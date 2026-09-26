package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.associations.Apriori;
import weka.associations.AssociationRule;
import weka.associations.AssociationRules;
import weka.associations.Item;
import weka.core.Attribute;
import weka.core.Instances;
import weka.core.SelectedTag;
import weka.core.Tag;
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
 *   <li>{@link #discretizeForApriori(Instances)} — 3 equal-frequency bins on 10 numeric cols</li>
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
            "Total_Trans_Ct", "Risk_Score", "Months_Inactive_12_mon",
            "Total_Ct_Chng_Q4_Q1", "Total_Revolving_Bal",
            "Contacts_Count_12_mon", "Total_Relationship_Count"
    );

    /** Attributes kept on the Apriori input set (everything else is dropped). */
    public static final List<String> APRIORI_KEEP = List.of(
            // Discretized numerics (now nominal)
            "Credit_Limit", "Avg_Utilization_Ratio", "Total_Trans_Amt",
            "Total_Trans_Ct", "Risk_Score", "Months_Inactive_12_mon",
            "Total_Ct_Chng_Q4_Q1", "Total_Revolving_Bal",
            "Contacts_Count_12_mon", "Total_Relationship_Count",
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
    public static final double CHURN_MIN_SUPPORT = 0.02;
    public static final double CHURN_FALLBACK_MIN_SUPPORT = 0.01;
    public static final double CHURN_MIN_LIFT = 1.5;
    public static final int CHURN_NUM_RULES = 100000;
    private static final int CHURN_TOP_N = 30;

    /** Regex for one rule line in {@link Apriori#toString()} output. */
    private static final Pattern RULE_LINE = Pattern.compile(
            "^\\s*\\d+\\.\\s+(.+?)\\s+(\\d+)\\s+==>\\s+(.+?)\\s+(\\d+)\\s+<conf:\\(([0-9.]+)\\)>\\s+lift:\\(([0-9.]+)\\).*$"
    );

    /** Discretize the 10 numeric columns from {@link #NUMERIC_TO_DISCRETIZE} (3 bins, equal-frequency). */
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
            for (String name : NUMERIC_TO_DISCRETIZE) {
                Attribute attribute = out.attribute(name);
                if (attribute != null && attribute.isNominal() && attribute.numValues() < 3) {
                    log.info("Discretization produced {} usable bins for {}", attribute.numValues(), name);
                }
            }
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

    /** Run the churn-focused Apriori pass, ranked and filtered by lift. */
    public Apriori runChurnApriori(Instances data, double minSupport) throws Exception {
        Apriori a = new Apriori();
        a.setLowerBoundMinSupport(minSupport);
        a.setUpperBoundMinSupport(minSupport);
        // Weka initializes support at 1 - delta, so this reaches the requested
        // floor in one cycle while the equal bounds keep the pass fixed there.
        a.setDelta(1.0 - minSupport);
        a.setMetricType(new SelectedTag(liftMetricTagId(), Apriori.TAGS_SELECTION));
        a.setMinMetric(CHURN_MIN_LIFT);
        a.setNumRules(CHURN_NUM_RULES);
        a.setOutputItemSets(false);
        a.buildAssociations(data);
        return a;
    }

    /**
     * Extract retention rules from {@link Apriori#toString()} output, filter to
     * {@code Attrition_Flag=Existing Customer} on RHS with {@code lift > minLift},
     * and keep the highest-support rules.
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
            if (!"Attrition_Flag=Existing Customer".equals(prettyRhs)) continue;
            if (lift <= minLift) continue;

            double support = totalInstances == 0 ? 0.0 : (double) jointCount / totalInstances;

            rules.add(new RuleRecord(
                    prettyJoin(lhs), prettyRhs,
                    round(support, 4), round(conf, 4), round(lift, 4),
                    "retention", "retention"));
        }
        rules.sort(Comparator.comparingDouble(RuleRecord::support).reversed()
                .thenComparing(Comparator.comparingDouble(RuleRecord::lift).reversed())
                .thenComparing(RuleRecord::lhs));
        if (rules.size() > FINAL_TOP_N) {
            rules = new ArrayList<>(rules.subList(0, FINAL_TOP_N));
        }
        log.info("Extracted {} rules with Attrition_Flag on RHS, lift > {}", rules.size(), minLift);
        return rules;
    }

    /**
     * Extract only rules whose consequence is exactly
     * {@code Attrition_Flag=Attrited Customer}, ordered by lift descending.
     */
    public List<RuleRecord> extractChurnRules(Apriori apriori, int totalInstances) throws Exception {
        AssociationRules associationRules = apriori.getAssociationRules();
        if (associationRules == null) return List.of();

        List<RuleRecord> rules = new ArrayList<>();
        for (AssociationRule rule : associationRules.getRules()) {
            if (rule.getConsequence().size() != 1) continue;
            Item rhsItem = rule.getConsequence().iterator().next();
            if (!"Attrition_Flag".equals(rhsItem.getAttribute().name())
                    || !"Attrited Customer".equals(rhsItem.getItemValueAsString())) {
                continue;
            }

            double lift = rule.getNamedMetricValue("Lift");
            if (lift < CHURN_MIN_LIFT) continue;
            double support = totalInstances == 0
                    ? 0.0
                    : (double) rule.getTotalSupport() / totalInstances;
            String lhs = rule.getPremise().stream()
                    .map(Item::toString)
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("");

            rules.add(new RuleRecord(
                    lhs,
                    rhsItem.toString(),
                    round(support, 4),
                    round(rule.getNamedMetricValue("Confidence"), 4),
                    round(lift, 4),
                    "churn",
                    "churn"));
        }
        rules.sort(Comparator.comparingDouble(RuleRecord::lift).reversed()
                .thenComparing(Comparator.comparingDouble(RuleRecord::support).reversed())
                .thenComparing(RuleRecord::lhs));
        if (rules.size() > CHURN_TOP_N) {
            rules = new ArrayList<>(rules.subList(0, CHURN_TOP_N));
        }
        log.info("Extracted {} churn rules with single-item Attrited Customer RHS, lift >= {}",
                rules.size(), CHURN_MIN_LIFT);
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

    private static int liftMetricTagId() {
        for (Tag tag : Apriori.TAGS_SELECTION) {
            if ("Lift".equalsIgnoreCase(tag.getReadable())) return tag.getID();
        }
        throw new IllegalStateException("Weka Apriori does not expose a Lift metric tag");
    }

    private static double round(double v, int decimals) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return v;
        double f = Math.pow(10, decimals);
        return Math.round(v * f) / f;
    }

    /** Lightweight in-memory record passed to JSON exporter / repo. */
    public record RuleRecord(String lhs, String rhs, double support,
                             double confidence, double lift, String category, String pass) { }
}
