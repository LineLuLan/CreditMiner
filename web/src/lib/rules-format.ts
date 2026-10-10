import type { Rule } from "@/types/api.types";
import { EDA_FIELD_LABELS, EDA_FIELD_UNITS, PAY_STATUS_LABELS } from "@/lib/constants";
import { formatDecimal, formatInt, formatNt, formatPct } from "@/lib/format";

const STATUS_FIELDS = new Set(["PAY_1", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6", "MAX_DELAY"]);

export interface ParsedRuleCondition {
  raw: string;
  label: string;
  value: string;
}

export function describeRule(rule: { lhs: string; rhs: string }) {
  const conditions = parseRuleSide(rule.lhs);
  const outcome = parseRuleSide(rule.rhs)[0];
  const outcomeValue = outcome ? outcome.value : friendlyRuleValue(rule.rhs);

  return {
    headline: `${conditions.map((condition) => condition.value).join(" + ")} -> ${outcomeValue}`,
    conditions,
  };
}

export function formatRuleAntecedent(value: string): string {
  return parseRuleSide(value)
    .map((condition) =>
      condition.label === "Sex" || condition.label === "Condition"
        ? condition.value
        : `${condition.label}: ${condition.value}`,
    )
    .join(", ");
}

export function formatRuleOutcome(value: string): string {
  return parseRuleSide(value)[0]?.value ?? friendlyRuleValue(value);
}

export function parseRuleSide(value: string): ParsedRuleCondition[] {
  return value
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return {
          raw: part,
          label: "Condition",
          value: friendlyRuleValue(part),
        };
      }

      const field = part.slice(0, separatorIndex).trim();
      const rawValue = part.slice(separatorIndex + 1).trim();

      return {
        raw: part,
        label: EDA_FIELD_LABELS[field] ?? field.replaceAll("_", " "),
        value: friendlyRuleValue(rawValue, field),
      };
    });
}

export function friendlyRuleValue(value: string, field?: string): string {
  const cleanValue = value.trim().replace(/^['"]|['"]$/g, "");

  if (field === "Default") {
    if (cleanValue === "Yes") return "Default";
    if (cleanValue === "No") return "Non-default";
  }

  if (field && STATUS_FIELDS.has(field)) {
    const status = Number(cleanValue);
    if (Number.isInteger(status) && PAY_STATUS_LABELS[status]) return PAY_STATUS_LABELS[status];
  }

  if (field === "MONTHS_DELAYED") {
    const months = Number(cleanValue);
    if (Number.isInteger(months))
      return `${formatInt(months)} ${months === 1 ? "month" : "months"}`;
  }

  const upperBound = cleanValue.match(/^\(-inf-(-?\d+(?:\.\d+)?)\]$/);
  if (upperBound) return `up to ${formatRuleNumber(upperBound[1], field)}`;

  const lowerBound = cleanValue.match(/^\((-?\d+(?:\.\d+)?)-inf\)$/);
  if (lowerBound) return `above ${formatRuleNumber(lowerBound[1], field)}`;

  const range = cleanValue.match(/^\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\]$/);
  if (range) return `${formatRuleNumber(range[1], field)} to ${formatRuleNumber(range[2], field)}`;

  const comparison = cleanValue.match(/^(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/);
  if (comparison) {
    const prefix: Record<string, string> = {
      "<=": "up to",
      ">=": "at least",
      "<": "below",
      ">": "above",
    };
    return `${prefix[comparison[1]]} ${formatRuleNumber(comparison[2], field)}`;
  }
  if (field === "AGE" && /^\d+(?:\.\d+)?-\d+(?:\.\d+)?$/.test(cleanValue))
    return `${cleanValue} years`;
  return cleanValue.replaceAll("_", " ");
}

function formatRuleNumber(value: string, field?: string, suppliedUnit?: string): string {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;
  const unit = suppliedUnit ?? (field ? EDA_FIELD_UNITS[field] : undefined);
  if (unit === "ratio") return formatPct(numericValue, 0);
  if (unit === "NT$") return formatNt(numericValue);
  const digits = Math.min(6, value.split(".")[1]?.length ?? 0);
  return formatDecimal(numericValue, numericValue >= 100 ? 0 : digits);
}

export const RULE_ATTRIBUTE_LABELS: Record<string, string> = {
  PAY_1: "Sep status",
  PAY_2: "Aug status",
  PAY_3: "Jul status",
  PAY_4: "Jun status",
  PAY_5: "May status",
  PAY_6: "Apr status",
  LIMIT_BAL: "Limit",
  AGE: "Age",
  AVG_UTILIZATION: "Mean use",
  UTILIZATION_1: "Sep use",
  PAY_RATIO: "Payment ratio",
  MAX_DELAY: "Worst delay",
  MONTHS_DELAYED: "Late months",
  BILL_AMT1: "Sep bill",
  PAY_AMT1: "Sep payment",
  BILL_TREND: "Balance change",
  SEX: "Sex",
  EDUCATION: "Education",
  MARRIAGE: "Marital status",
  RISK_TIER: "Derived tier",
};

export interface RuleCondition {
  attribute: string;
  label?: string;
  operator?: string;
  value: string | number;
  unit?: string;
}

interface NameableRule {
  lhs: string;
  conditions?: RuleCondition[];
  shortName?: string;
  familyId?: string;
  familyLabel?: string;
}

export function ruleConditions(rule: NameableRule): RuleCondition[] {
  if (rule.conditions?.length) return rule.conditions;
  return rule.lhs
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((raw) => {
      const index = raw.indexOf("=");
      return index < 0
        ? { attribute: "Condition", value: raw }
        : {
            attribute: raw.slice(0, index).trim(),
            operator: "=",
            value: raw.slice(index + 1).trim(),
          };
    });
}

function conditionPriority(condition: RuleCondition): number {
  if (/^PAY_[1-6]$/.test(condition.attribute)) return Number(condition.attribute.slice(-1));
  if (condition.attribute === "MAX_DELAY") return 7;
  if (condition.attribute === "MONTHS_DELAYED") return 8;
  return ["AGE", "SEX", "EDUCATION", "MARRIAGE", "RISK_TIER"].includes(condition.attribute)
    ? 20
    : 10;
}

function orderedConditions(rule: NameableRule): RuleCondition[] {
  return ruleConditions(rule)
    .slice()
    .sort((a, b) => conditionPriority(a) - conditionPriority(b));
}

/**
 * Intent: readable names while preserving exact conditions and outcome separately.
 * Status: structured backend fields take precedence; legacy lhs remains supported.
 * Next: retire lhs derivation once all artifacts carry conditions. Blockers: none.
 * Confidence: both label grammars and current sample names covered by node tests.
 */
export function conditionText(condition: RuleCondition): string {
  const { attribute, operator, unit } = condition;
  const raw = String(condition.value)
    .trim()
    .replace(/^[\'"]|[\'"]$/g, "");
  const label =
    RULE_ATTRIBUTE_LABELS[attribute] ?? condition.label ?? attribute.replaceAll("_", " ");
  let value: string;
  const numeric = raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
  if (numeric !== null && operator && operator !== "=") {
    const prefixes: Record<string, string> = {
      "<=": "up to",
      ">": "above",
      ">=": "at least",
      "<": "below",
      "!=": "not",
    };
    value = `${prefixes[operator] ?? operator} ${formatRuleNumber(raw, attribute, unit)}`;
  } else if (numeric !== null && STATUS_FIELDS.has(attribute)) {
    const statuses: Record<string, string> = {
      "-2": "no use",
      "-1": "paid in full",
      "0": "revolving",
      "1": "1 mo late",
      "2": "2 mo late",
    };
    value = numeric >= 3 ? "3+ mo late" : (statuses[raw] ?? raw);
  } else if (numeric !== null && attribute !== "MONTHS_DELAYED") {
    value = formatRuleNumber(raw, attribute, unit);
  } else {
    value = friendlyRuleValue(raw, attribute);
  }
  if (numeric === null && operator && operator !== "=") {
    value = `${operator === "!=" ? "not" : operator} ${value}`;
  }
  return `${label}: ${value}`;
}

export function shortRuleName(rule: NameableRule): string {
  return (
    rule.shortName?.trim() ||
    orderedConditions(rule).slice(0, 2).map(compactConditionText).join("; ") ||
    "Unspecified conditions"
  );
}

// Intent: keep API and fallback short names identical for captured conditions.
// Status: tested for all representatives and members. Next: retain long-form
// condition tooltips. Blockers: none. Confidence: captured sample parity tests.
function compactConditionText(condition: RuleCondition): string {
  const { attribute, operator = "=", unit } = condition;
  const fullLabel = RULE_ATTRIBUTE_LABELS[attribute] ?? condition.label ?? attribute;
  const label = /^PAY_[1-6]$/.test(attribute) ? fullLabel.replace(/ status$/, "") : fullLabel;
  let value = String(condition.value)
    .trim()
    .replace(/^[\'"]|[\'"]$/g, "");
  if (operator !== "=" && operator !== "in") value = `${operator}${value}`;
  const interval = value.match(/^[[(](-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?|inf)[\])]$/);
  if (interval)
    value = interval[2] === "inf" ? `>=${interval[1]}` : `${interval[1]}-${interval[2]}`;
  if (STATUS_FIELDS.has(attribute)) {
    if (value === "<=0") value = "no delay";
    else if (value === ">=3" || value === "3+") value = "3+ mo late";
    else if (/^-?\d+$/.test(value)) {
      const statuses: Record<string, string> = {
        "-2": "no use",
        "-1": "paid in full",
        "0": "revolving",
      };
      value = statuses[value] ?? `${Number(value) >= 3 ? "3+" : value} mo late`;
    } else return conditionText(condition);
  } else if (attribute === "MONTHS_DELAYED") {
    value = `${value.replace(/^>=/, "")}${value.startsWith(">=") ? "+" : ""} mo`;
  } else if (attribute === "LIMIT_BAL" && !value.includes("inf")) {
    const compactNt = (amount: string) => `NT$${formatInt(Number(amount) / 1000)}k`;
    const range = value.match(/^(\d+)-(\d+)$/);
    const bound = value.match(/^(<=|>=|<|>)?(\d+)$/);
    if (range) value = `${compactNt(range[1])}-${compactNt(range[2])}`;
    else if (bound) value = `${bound[1] ?? ""}${compactNt(bound[2])}`;
    else return conditionText(condition);
  } else if (unit === "%" && !value.endsWith("%")) value += "%";
  else if (operator === "!=" || (operator === "in" && !interval)) return conditionText(condition);
  return `${label}: ${value}`;
}

export function ruleFamily(rule: NameableRule): string {
  if (rule.familyId?.trim()) return rule.familyId.trim();
  const first = orderedConditions(rule)[0];
  // Raw IDs keep distinct status codes apart even when both display as 3+ months.
  return first
    ? JSON.stringify([
        first.attribute,
        first.operator ?? "=",
        String(first.value).replace(/^[\'"]|[\'"]$/g, ""),
      ])
    : "unspecified";
}

export function ruleFamilyLabel(rule: NameableRule): string {
  const first = orderedConditions(rule)[0];
  return (
    rule.familyLabel?.trim() || (first ? compactConditionText(first) : "Unspecified conditions")
  );
}

export interface RuleFamilyGroup {
  id: string;
  label: string;
  rules: Rule[];
}

export function groupRuleFamilies(rules: Rule[], minLift = 0): RuleFamilyGroup[] {
  const groups = new Map<string, RuleFamilyGroup>();
  const expanded = rules.flatMap((rule) => [rule, ...(rule.familyMembers ?? [])]);
  for (const rule of expanded.filter((rule) => rule.lift >= minLift)) {
    // Different outcomes need different confidence baselines, even for the same condition.
    const id = JSON.stringify([rule.category, ruleFamily(rule)]);
    const group = groups.get(id) ?? { id, label: ruleFamilyLabel(rule), rules: [] };
    if (!group.rules.some((member) => member.ruleId === rule.ruleId)) group.rules.push(rule);
    groups.set(id, group);
  }
  for (const group of groups.values()) {
    group.rules.sort(
      (a, b) =>
        ruleConditions(a).length - ruleConditions(b).length ||
        b.lift - a.lift ||
        b.confidence - a.confidence ||
        a.ruleId - b.ruleId,
    );
  }
  return [...groups.values()].sort((a, b) => b.rules[0].lift - a.rules[0].lift);
}
