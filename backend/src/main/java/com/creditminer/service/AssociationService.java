package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.associations.Apriori;
import weka.associations.ItemSet;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.BitSet;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Phase 7: fixed readable bins, bounded class-association views and coverage pruning. */
@Slf4j
@Service
public class AssociationService {
    public static final List<String> REPAYMENT = List.of("PAY_1", "MAX_DELAY", "MONTHS_DELAYED");
    public static final List<String> OTHER = List.of("LIMIT_BAL", "AVG_UTILIZATION", "PAY_RATIO",
            "AGE", "EDUCATION", "MARRIAGE", "SEX");
    public static final List<String> NUMERIC_TO_DISCRETIZE = List.of("LIMIT_BAL", "AVG_UTILIZATION", "PAY_RATIO", "AGE");
    public static final List<String> EXACT_NUMERIC_ITEMS = REPAYMENT;
    public static final List<String> APRIORI_KEEP = java.util.stream.Stream.concat(
            java.util.stream.Stream.concat(REPAYMENT.stream(), OTHER.stream()), java.util.stream.Stream.of("Default")).toList();
    public static final double NON_DEFAULT_MIN_SUPPORT = .02;
    public static final double NON_DEFAULT_MIN_CONFIDENCE = .85;
    public static final double DEFAULT_MIN_LIFT = 1.25;
    public static final List<Double> DEFAULT_SUPPORT_STEPS = List.of(.01);
    public static final int MAX_PREMISE_ATTRIBUTES = 2;
    public static final int MAX_RULES_PER_SUBSET = 10000;
    private static final int TARGET_TOP_N = 15;
    private static final Comparator<RuleRecord> QUALITY = Comparator.comparingDouble(RuleRecord::lift).reversed()
            .thenComparing(Comparator.comparingDouble(RuleRecord::support).reversed()).thenComparing(RuleRecord::lhs);
    private final Map<String, Map<String, Object>> subsetRuns = new LinkedHashMap<>();
    private final Map<String, Map<String, Integer>> pruningCounts = new LinkedHashMap<>();
    private final Map<String, List<RuleRecord>> familyMembers = new LinkedHashMap<>();

    /* Intent: encode bounds in each item so persisted lhs remains self-describing.
       Status: fixed bins; next: regenerate only through Phase7. Blockers: none.
       Confidence: boundary and coverage tests; no production data/schema mutation. */
    public Instances prepareForApriori(Instances data) {
        long[] bounds = limitQuartiles(data);
        ArrayList<Attribute> attrs = new ArrayList<>();
        for (String name : APRIORI_KEEP) {
            Attribute source = data.attribute(name);
            if (source == null) continue;
            List<String> labels = binLabels(name, bounds);
            attrs.add(labels == null ? (Attribute) source.copy() : new Attribute(name, new ArrayList<>(labels)));
        }
        Instances prepared = new Instances("credit-association-fixed-bins", attrs, data.numInstances());
        for (Instance source : data) {
            DenseInstance row = new DenseInstance(attrs.size());
            row.setDataset(prepared);
            for (Attribute target : attrs) {
                Attribute from = data.attribute(target.name());
                if ("PAY_RATIO".equals(target.name()) && undefinedPaymentRatio(source)) {
                    row.setValue(target, "n/a");
                } else if (source.isMissing(from)) {
                    row.setMissing(target);
                } else if (binLabels(target.name(), bounds) != null) {
                    double value = from.isNumeric() ? source.value(from) : Double.parseDouble(source.stringValue(from));
                    row.setValue(target, bin(target.name(), value, bounds));
                } else {
                    row.setValue(target, source.stringValue(from));
                }
            }
            prepared.add(row);
        }
        prepared.setClassIndex(prepared.attribute("Default").index());
        return prepared;
    }

    public Instances discretizeForApriori(Instances data) { return prepareForApriori(data); }

    public Instances retainKeepCols(Instances data) throws Exception {
        return selectAttributes(data, APRIORI_KEEP.stream().filter(n -> !n.equals("Default") && data.attribute(n) != null).toList());
    }

    private static boolean undefinedPaymentRatio(Instance row) {
        // Phase3 clamps a zero denominator to 1; inspect the original bills before dropping them.
        double denominator = 0;
        for (int i = 1; i <= 6; i++) {
            Attribute bill = row.dataset().attribute("BILL_AMT" + i);
            if (bill == null) return row.isMissing(row.dataset().attribute("PAY_RATIO"));
            if (row.isMissing(bill)) return true;
            denominator += Math.max(0, row.value(bill));
        }
        return denominator == 0;
    }

    private static long[] limitQuartiles(Instances data) {
        Attribute limit = data.attribute("LIMIT_BAL");
        if (limit == null) return new long[]{0, 0, 0};
        double[] values = java.util.stream.IntStream.range(0, data.numInstances())
                .filter(i -> !data.instance(i).isMissing(limit)).mapToDouble(i -> data.instance(i).value(limit)).sorted().toArray();
        if (values.length == 0) throw new IllegalArgumentException("LIMIT_BAL has no observed values");
        long[] bounds = new long[3];
        for (int i = 0; i < 3; i++) {
            double position = (values.length - 1) * (i + 1) / 4.0;
            double q = values[(int) position] + (position - (int) position) * (values[(int) Math.ceil(position)] - values[(int) position]);
            bounds[i] = Math.round(q / 1000) * 1000;
        }
        return bounds;
    }

    private static List<String> binLabels(String name, long[] q) {
        return switch (name) {
            case "LIMIT_BAL" -> List.of("<=" + q[0], (q[0] + 1) + "-" + q[1], (q[1] + 1) + "-" + q[2], ">" + q[2]);
            case "AVG_UTILIZATION" -> List.of("<=0%", "0-25%", "25-50%", "50-100%", ">100%");
            case "PAY_RATIO" -> List.of("0%", "0-10%", "10-50%", "50-100%", ">=100%", "n/a");
            case "AGE" -> List.of("<=29", "30-39", "40-49", "50-59", ">=60");
            case "PAY_1" -> List.of("-2", "-1", "0", "1", "2", "3+");
            case "MAX_DELAY" -> List.of("<=0", "1", "2", "3+");
            case "MONTHS_DELAYED" -> List.of("0", "1", "2", "3+");
            default -> null;
        };
    }

    static String bin(String name, double value, long[] q) {
        if (!Double.isFinite(value)) return "n/a";
        return switch (name) {
            case "LIMIT_BAL" -> value <= q[0] ? "<=" + q[0] : value <= q[1] ? (q[0] + 1) + "-" + q[1]
                    : value <= q[2] ? (q[1] + 1) + "-" + q[2] : ">" + q[2];
            case "AVG_UTILIZATION" -> value <= 0 ? "<=0%" : value <= .25 ? "0-25%" : value <= .5 ? "25-50%" : value <= 1 ? "50-100%" : ">100%";
            case "PAY_RATIO" -> value == 0 ? "0%" : value <= .1 ? "0-10%" : value <= .5 ? "10-50%" : value < 1 ? "50-100%" : ">=100%";
            case "AGE" -> value < 30 ? "<=29" : value < 40 ? "30-39" : value < 50 ? "40-49" : value < 60 ? "50-59" : ">=60";
            case "MAX_DELAY" -> value <= 0 ? "<=0" : value >= 3 ? "3+" : Integer.toString((int) value);
            case "PAY_1", "MONTHS_DELAYED" -> value >= 3 ? "3+" : Integer.toString((int) value);
            default -> throw new IllegalArgumentException("No binning for " + name);
        };
    }

    public List<RuleRecord> findNonDefaultRules(Instances data) throws Exception {
        return mineTargetDirected(data, .02, "No", .85, 1.08);
    }

    /** The single supervisor-authorized alternative; all other mining/pruning settings stay fixed. */
    public List<RuleRecord> findRelaxedNonDefaultRules(Instances data) throws Exception {
        return mineTargetDirected(data, .02, "No", .82, 1.05);
    }

    public static NonDefaultSelection selectNonDefaultRules(List<RuleRecord> original, List<RuleRecord> relaxed) {
        if (relaxed.size() >= 8) return new NonDefaultSelection(relaxed.stream().limit(12).toList(), "relaxed", .82, 1.05);
        return new NonDefaultSelection(List.copyOf(original), "original", .85, 1.08);
    }

    public record NonDefaultSelection(List<RuleRecord> rules, String pass, double minConfidence, double minLift) { }

    public TargetRuleSearch findDefaultRules(Instances data, List<Double> supportSteps) throws Exception {
        if (!DEFAULT_SUPPORT_STEPS.equals(supportSteps)) throw new IllegalArgumentException("Fixed default support is 0.01; no support ladder");
        return new TargetRuleSearch(DEFAULT_SUPPORT_STEPS, .01, mineTargetDirected(data, .01, "Yes", .30, 1.25));
    }

    private List<RuleRecord> mineTargetDirected(Instances data, double support, String target,
                                               double confidence, double lift) throws Exception {
        Map<String, RuleRecord> unique = new LinkedHashMap<>();
        List<String> predictors = APRIORI_KEEP.stream().filter(n -> !n.equals("Default") && data.attribute(n) != null).toList();
        for (String p : predictors) collectCarRules(data, List.of(p), support, confidence, target, lift, unique);
        for (String repayment : REPAYMENT) for (String other : OTHER) {
            if (data.attribute(repayment) != null && data.attribute(other) != null)
                collectCarRules(data, List.of(repayment, other), support, confidence, target, lift, unique);
        }
        PruningResult result = prune(data, new ArrayList<>(unique.values()));
        pruningCounts.put(target.equals("Yes") ? "default" : "non-default", result.counts());
        familyMembers.put(target.equals("Yes") ? "default" : "non-default", result.familyMembers());
        log.info("{} pruning: {}", target, result.counts());
        return result.rules();
    }

    private void collectCarRules(Instances data, List<String> predictors, double support, double confidence,
                                 String target, double lift, Map<String, RuleRecord> destination) throws Exception {
        Instances subset = selectAttributes(data, predictors);
        validateSubset(subset);
        Apriori apriori = new Apriori();
        apriori.setOptions(new String[]{"-c", "last", "-T", "0", "-N", "10000", "-U", "1.0",
                "-M", Double.toString(support), "-D", "0.05", "-C", Double.toString(confidence)});
        ArrayList<Object>[] raw = apriori.mineCARs(subset);
        Map<String, RuleRecord> found = new LinkedHashMap<>();
        if (raw != null && raw.length >= 3) for (int i = 0; i < raw[0].size(); i++) {
            String rhs = itemSetText((ItemSet) raw[1].get(i), apriori.getInstancesOnlyClass());
            if (!rhs.equals("Default=" + target)) continue;
            String lhs = itemSetText((ItemSet) raw[0].get(i), apriori.getInstancesNoClass());
            if (lhs.isEmpty() || lhs.contains("=n/a")) continue;
            RuleRecord rule = measure(data, lhs, target);
            if (qualifies(rule, support, confidence, lift)) found.putIfAbsent(lhs, rule);
        }
        int aprioriCount = found.size();
        String method = "weka-apriori";
        if (found.isEmpty()) {
            method = "exact-enumeration";
            for (RuleRecord rule : enumerateRules(subset, predictors, target, support, confidence, lift))
                found.putIfAbsent(rule.lhs(), rule);
        }
        subsetRuns.put(target + ":" + String.join("+", predictors), Map.of(
                "method", method, "aprioriQualifying", aprioriCount, "qualifying", found.size()));
        found.forEach(destination::putIfAbsent);
    }

    private static boolean qualifies(RuleRecord rule, double support, double confidence, double lift) {
        return rule.support() >= support && rule.confidence() >= confidence && rule.lift() >= lift;
    }

    List<RuleRecord> enumerateRules(Instances data, List<String> predictors, String target,
                                    double support, double confidence, double lift) {
        List<String> antecedents = new ArrayList<>();
        for (String name : predictors) {
            Attribute attr = data.attribute(name);
            for (int i = 0; i < attr.numValues(); i++)
                if (!attr.value(i).equals("n/a")) antecedents.add(name + "=" + attr.value(i));
        }
        if (predictors.size() == 2) {
            Attribute a = data.attribute(predictors.get(0)), b = data.attribute(predictors.get(1));
            for (int i = 0; i < a.numValues(); i++) for (int j = 0; j < b.numValues(); j++)
                if (!a.value(i).equals("n/a") && !b.value(j).equals("n/a"))
                    antecedents.add(a.name() + "=" + a.value(i) + ", " + b.name() + "=" + b.value(j));
        }
        return antecedents.stream().map(lhs -> measure(data, lhs, target))
                .filter(rule -> qualifies(rule, support, confidence, lift)).toList();
    }

    public Map<String, Map<String, Object>> subsetRuns() { return Map.copyOf(subsetRuns); }

    public PruningResult prune(Instances data, List<RuleRecord> candidates) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("beforePruning", candidates.size());
        Map<String, BitSet> coverageCache = new LinkedHashMap<>();
        Map<CoverageKey, RuleRecord> coverage = new LinkedHashMap<>();
        candidates.stream().sorted(Comparator.comparingInt((RuleRecord r) -> items(r.lhs()).size()).thenComparing(QUALITY))
                .forEach(r -> coverage.putIfAbsent(new CoverageKey(r.rhs(),
                        coverageCache.computeIfAbsent(r.lhs(), lhs -> covered(data, lhs))), r));
        counts.put("afterCoverage", coverage.size());
        List<RuleRecord> improved = coverage.values().stream().filter(r -> {
            List<String> parts = items(r.lhs());
            if (parts.size() < 2) return true;
            String target = r.rhs().substring("Default=".length());
            // Compare against every one-item subrule, including those below mining thresholds.
            double best = parts.stream().mapToDouble(part -> measure(data, part, target).confidence()).max().orElse(0);
            return r.confidence() - best >= .02 - 1e-12;
        }).sorted(Comparator.comparingInt((RuleRecord r) -> items(r.lhs()).size()).thenComparing(QUALITY)).toList();
        counts.put("afterConfidenceGain", improved.size());
        Map<String, RuleRecord> families = new LinkedHashMap<>();
        for (RuleRecord r : improved) families.putIfAbsent(r.rhs() + ":" + RuleNaming.describe(r.lhs(), r.rhs()).familyId(), r);
        counts.put("afterFamily", families.size());
        List<RuleRecord> result = families.values().stream().sorted(QUALITY).limit(TARGET_TOP_N).toList();
        List<RuleRecord> members = improved.stream().filter(r -> !families.containsValue(r)).sorted(QUALITY).toList();
        counts.put("afterLimit", result.size());
        return new PruningResult(result, members, counts);
    }

    /** Preserve qualifying variants only for published families; gates still count representatives. */
    public List<RuleRecord> familyMembers(String category, List<RuleRecord> representatives) {
        var published = representatives.stream().map(r -> RuleNaming.describe(r.lhs(), r.rhs()).familyId())
                .collect(java.util.stream.Collectors.toSet());
        return familyMembers.getOrDefault(category, List.of()).stream()
                .filter(r -> published.contains(RuleNaming.describe(r.lhs(), r.rhs()).familyId())).toList();
    }

    RuleRecord measure(Instances data, String lhs, String target) {
        BitSet coverage = covered(data, lhs);
        int joint = 0;
        Attribute outcome = data.attribute("Default");
        for (int row = coverage.nextSetBit(0); row >= 0; row = coverage.nextSetBit(row + 1))
            if (data.instance(row).stringValue(outcome).equals(target)) joint++;
        int lhsCount = coverage.cardinality();
        double confidence = lhsCount == 0 ? 0 : (double) joint / lhsCount;
        double base = targetRate(data, target);
        String category = target.equals("Yes") ? "default" : "non-default";
        return new RuleRecord(lhs, "Default=" + target, (double) joint / data.numInstances(), confidence,
                base == 0 ? 0 : confidence / base, category, category, joint, lhsCount);
    }

    private static BitSet covered(Instances data, String lhs) {
        List<String[]> parts = items(lhs).stream().map(part -> part.split("=", 2)).toList();
        int[] attributes = new int[parts.size()], values = new int[parts.size()];
        for (int i = 0; i < parts.size(); i++) {
            Attribute attr = data.attribute(parts.get(i)[0]);
            if (attr == null) return new BitSet();
            attributes[i] = attr.index();
            values[i] = attr.indexOfValue(parts.get(i)[1]);
        }
        BitSet rows = new BitSet(data.numInstances());
        for (int i = 0; i < data.numInstances(); i++) {
            boolean match = true;
            for (int j = 0; j < attributes.length; j++) {
                if (data.instance(i).isMissing(attributes[j]) || data.instance(i).value(attributes[j]) != values[j]) {
                    match = false; break;
                }
            }
            if (match) rows.set(i);
        }
        return rows;
    }

    private static List<String> items(String lhs) { return Arrays.asList(lhs.split(", ")); }

    public static double targetRate(Instances data, String target) {
        Attribute attr = data.attribute("Default");
        long count = java.util.stream.IntStream.range(0, data.numInstances())
                .filter(i -> !data.instance(i).isMissing(attr) && data.instance(i).stringValue(attr).equals(target)).count();
        return data.isEmpty() ? 0 : (double) count / data.numInstances();
    }

    public Map<String, Map<String, Integer>> pruningCounts() { return Map.copyOf(pruningCounts); }

    public Map<String, Object> discretizationMetadata(Instances prepared) {
        Map<String, Object> bins = new LinkedHashMap<>();
        for (String name : APRIORI_KEEP) {
            Attribute attr = prepared.attribute(name);
            if (attr != null) bins.put(name, java.util.Collections.list(attr.enumerateValues()));
        }
        return Map.of("method", "fixed human-readable bins; LIMIT_BAL linear-interpolated quartiles rounded to NT$1000",
                "bins", bins, "intervalConvention", "Percent ranges: lower exclusive, upper inclusive; PAY_RATIO 50-100% excludes 100%; integer ranges inclusive",
                "undefinedPaymentRatio", "n/a when sum of positive original bills is zero or missing; excluded from rules",
                "excluded", List.of("ID", "RISK_TIER", "UTILIZATION_1", "BILL_AMT1", "PAY_AMT1", "BILL_TREND", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6"));
    }

    static Instances selectAttributes(Instances data, List<String> predictors) throws Exception {
        int[] indices = java.util.stream.Stream.concat(predictors.stream(), java.util.stream.Stream.of("Default"))
                .mapToInt(n -> data.attribute(n).index()).toArray();
        Remove selector = new Remove();
        selector.setInvertSelection(true);
        selector.setAttributeIndicesArray(indices);
        selector.setInputFormat(data);
        Instances selected = Filter.useFilter(data, selector);
        // Remove preserves source order; Default is last in the prepared schema.
        selected.setClassIndex(selected.attribute("Default").index());
        return selected;
    }

    static void validateSubset(Instances subset) {
        if (subset.classIndex() != subset.numAttributes() - 1 || !subset.classAttribute().name().equals("Default")
                || !java.util.Collections.list(subset.classAttribute().enumerateValues()).equals(List.of("No", "Yes")))
            throw new IllegalArgumentException("Apriori requires final nominal Default with values No, Yes");
        for (int i = 0; i < subset.numAttributes(); i++)
            if (!subset.attribute(i).isNominal()) throw new IllegalArgumentException("Apriori requires all-nominal predictors");
    }

    private static String itemSetText(ItemSet itemSet, Instances header) {
        List<String> items = new ArrayList<>();
        for (int i = 0; i < header.numAttributes(); i++) {
            int value = itemSet.itemAt(i);
            if (value >= 0) items.add(header.attribute(i).name() + "=" + header.attribute(i).value(value));
        }
        return String.join(", ", items);
    }

    private record CoverageKey(String rhs, BitSet rows) { }
    public record RuleRecord(String lhs, String rhs, double support, double confidence, double lift,
                             String category, String pass, int jointCount, int lhsCount) { }
    public record TargetRuleSearch(List<Double> attemptedSupports, double finalSupport, List<RuleRecord> rules) { }
    public record PruningResult(List<RuleRecord> rules, List<RuleRecord> familyMembers, Map<String, Integer> counts) { }
}
