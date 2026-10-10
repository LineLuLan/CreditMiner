package com.creditminer.service;

import com.creditminer.dto.response.RuleResponse;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** Pure presentation derived from persisted text; supports both fixed bins and legacy Weka intervals. */
public final class RuleNaming {
    private RuleNaming() { }
    private static final Map<String, String> LABELS = Map.ofEntries(
            Map.entry("PAY_1", "Sep status"), Map.entry("PAY_2", "Aug status"), Map.entry("PAY_3", "Jul status"),
            Map.entry("PAY_4", "Jun status"), Map.entry("PAY_5", "May status"), Map.entry("PAY_6", "Apr status"),
            Map.entry("LIMIT_BAL", "Limit"), Map.entry("AGE", "Age"), Map.entry("AVG_UTILIZATION", "Mean use"),
            Map.entry("UTILIZATION_1", "Sep use"), Map.entry("PAY_RATIO", "Payment ratio"),
            Map.entry("MAX_DELAY", "Worst delay"), Map.entry("MONTHS_DELAYED", "Late months"),
            Map.entry("BILL_AMT1", "Sep bill"), Map.entry("PAY_AMT1", "Sep payment"),
            Map.entry("BILL_TREND", "Balance change"), Map.entry("SEX", "Sex"),
            Map.entry("EDUCATION", "Education"), Map.entry("MARRIAGE", "Marital status"),
            Map.entry("RISK_TIER", "Derived tier"), Map.entry("Default", "Outcome"));
    private static final Pattern INTERVAL = Pattern.compile("^[\\[(](-?inf|-?\\d+(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)-(-?inf|-?\\d+(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)[\\])]$");
    private static final Pattern RANGE = Pattern.compile("^-?\\d+(?:\\.\\d+)?--?\\d+(?:\\.\\d+)?%?$");

    public record Condition(String attribute, String label, String operator, String value, String unit) { }
    public record NamedRule(List<Condition> conditions, String shortName, String familyId, String familyLabel) { }
    private record Item(String attribute, String raw) { }

    /* Intent: one deterministic naming contract for offline artifacts, legacy rows and report fallback.
       Status: additive only. Next: frontend adoption. Blockers: none; confidence backed by parser tests. */
    public static NamedRule describe(String lhs, String rhs) {
        List<Item> items = Arrays.stream(lhs.split(",\\s*(?=[A-Za-z_][A-Za-z_0-9]*=)"))
                .map(s -> s.split("=", 2)).filter(p -> p.length == 2)
                .map(p -> new Item(p[0].trim(), unquote(p[1].trim())))
                .sorted(Comparator.comparingInt((Item i) -> priority(i.attribute())).thenComparingInt(i -> i.attribute().matches("PAY_[1-6]") ? 0 : 1).thenComparing(Item::attribute)).toList();
        List<Condition> conditions = items.stream().map(RuleNaming::condition).toList();
        if (items.isEmpty()) return new NamedRule(conditions, lhs, "unknown", "Unknown condition");
        Item family = items.get(0);
        String name = items.stream().limit(2).map(RuleNaming::fragment).collect(java.util.stream.Collectors.joining("; "));
        return new NamedRule(conditions, name, family.attribute() + "=" + family.raw(), fragment(family));
    }

    public static RuleResponse enrich(RuleResponse response, Long totalRows, Double defaultRate) {
        NamedRule named = describe(response.getLhs(), response.getRhs());
        response.setConditions(named.conditions());
        response.setShortName(named.shortName());
        response.setFamilyId(named.familyId());
        response.setFamilyLabel(named.familyLabel());
        if (response.getJointCount() == null && totalRows != null)
            response.setJointCount(Math.round(response.getSupport() * totalRows));
        if (defaultRate != null) {
            response.setBaseline("default".equals(response.getCategory()) ? defaultRate : 1 - defaultRate);
        } else if (response.getLift() > 0) {
            double rate = response.getConfidence() / response.getLift();
            if (Double.isFinite(rate) && rate >= 0 && rate <= 1) response.setBaseline(rate);
        }
        return response;
    }

    private static int priority(String attr) {
        if (attr.matches("PAY_[1-6]") || attr.equals("MAX_DELAY") || attr.equals("MONTHS_DELAYED")) return 0;
        if (List.of("LIMIT_BAL", "AVG_UTILIZATION", "UTILIZATION_1", "PAY_RATIO", "BILL_AMT1", "PAY_AMT1", "BILL_TREND").contains(attr)) return 1;
        return 2;
    }

    private static String unquote(String value) {
        if (value.length() >= 2 && ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith("\"") && value.endsWith("\""))))
            return value.substring(1, value.length() - 1);
        return value;
    }

    private static String unit(String attr) {
        if (List.of("LIMIT_BAL", "BILL_AMT1", "PAY_AMT1").contains(attr)) return "NT$";
        if (List.of("AVG_UTILIZATION", "UTILIZATION_1", "PAY_RATIO", "BILL_TREND").contains(attr)) return "%";
        if (attr.equals("AGE")) return "years";
        if (priority(attr) == 0) return "months";
        return "";
    }

    private static Condition condition(Item item) {
        String raw = item.raw(), op = "=", value = raw, unit = unit(item.attribute());
        var interval = INTERVAL.matcher(raw);
        if (interval.matches()) {
            String low = interval.group(1), high = interval.group(2);
            if (low.equals("-inf")) { op = "<="; value = scaled(high, unit); }
            else if (high.equals("inf")) { op = ">"; value = scaled(low, unit); }
            else { op = "in"; value = raw.substring(0, 1) + scaled(low, unit) + ", " + scaled(high, unit) + raw.substring(raw.length() - 1); }
        } else if (raw.startsWith("<=")) { op = "<="; value = raw.substring(2).replace("%", ""); }
        else if (raw.startsWith(">=")) { op = "in"; value = "[" + raw.substring(2).replace("%", "") + ", inf)"; }
        else if (raw.startsWith(">")) { op = ">"; value = raw.substring(1).replace("%", ""); }
        else if (raw.endsWith("+")) { op = "in"; value = "[" + raw.substring(0, raw.length() - 1) + ", inf)"; }
        else if (RANGE.matcher(raw).matches()) {
            op = "in";
            String[] bounds = raw.replace("%", "").split("(?<=\\d)-", 2);
            String left = unit.equals("%") ? "(" : "[";
            String right = item.attribute().equals("PAY_RATIO") && raw.equals("50-100%") ? ")" : "]";
            value = left + bounds[0] + ", " + bounds[1] + right;
        } else value = raw.replace("%", "");
        return new Condition(item.attribute(), LABELS.getOrDefault(item.attribute(), item.attribute()), op, value, unit);
    }

    private static String fragment(Item item) {
        String label = LABELS.getOrDefault(item.attribute(), item.attribute());
        if (item.attribute().matches("PAY_[1-6]")) label = label.replace(" status", "");
        return label + ": " + display(item);
    }

    private static String display(Item item) {
        String attr = item.attribute(), raw = item.raw();
        if (attr.matches("PAY_[1-6]")) return switch (raw) {
            case "-2" -> "no use"; case "-1" -> "paid in full"; case "0" -> "revolving";
            default -> raw + " mo late";
        };
        if (attr.equals("MAX_DELAY")) return raw.equals("<=0") ? "no delay" : raw + " mo late";
        if (attr.equals("MONTHS_DELAYED")) return raw + " mo";
        var interval = INTERVAL.matcher(raw);
        if (interval.matches()) {
            String low = interval.group(1), high = interval.group(2);
            if (low.equals("-inf")) return "up to " + human(high, unit(attr), true);
            if (high.equals("inf")) return "above " + human(low, unit(attr), true);
            return human(low, unit(attr), true) + "-" + human(high, unit(attr), true);
        }
        if (unit(attr).equals("NT$")) {
            if (raw.startsWith("<=")) return "<=" + human(raw.substring(2), "NT$", false);
            if (raw.startsWith(">")) return ">" + human(raw.substring(1), "NT$", false);
            if (RANGE.matcher(raw).matches()) {
                String[] parts = raw.split("(?<=\\d)-", 2);
                return human(parts[0], "NT$", false) + "-" + human(parts[1], "NT$", false);
            }
            return human(raw, "NT$", false);
        }
        return raw;
    }

    private static String scaled(String value, String unit) {
        double number = Double.parseDouble(value) * (unit.equals("%") ? 100 : 1);
        return BigDecimal.valueOf(number).stripTrailingZeros().toPlainString();
    }

    private static String human(String value, String unit, boolean legacy) {
        double number = Double.parseDouble(value) * (legacy && unit.equals("%") ? 100 : 1);
        if (unit.equals("%")) return Math.round(number) + "%";
        if (unit.equals("NT$")) return "NT$" + Math.round(number / 1000) + "k";
        return BigDecimal.valueOf(number).stripTrailingZeros().toPlainString();
    }
}
