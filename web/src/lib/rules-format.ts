import type { RuleFamily, RuleFamiliesResponse } from "@/lib/schemas";
import { EDA_FIELD_UNITS, PAY_STATUS_LABELS, FEATURE_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import { formatDecimal, formatInt, formatNt, formatPct } from "@/lib/format";

const STATUS_FIELDS = new Set(["PAY_1", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6", "MAX_DELAY"]);

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
  const labels = CATEGORY_LABELS[field as keyof typeof CATEGORY_LABELS] as Record<string, string> | undefined;
  return labels?.[cleanValue] ?? cleanValue.replaceAll("_", " ");
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

export const RULE_ATTRIBUTE_LABELS: Record<string, string> = FEATURE_LABELS;

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
      "1": "1 month late",
      "2": "2 months late",
    };
    value = numeric >= 3 ? "3+ months late" : (statuses[raw] ?? raw);
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
  if (rule.shortName?.trim()) return rule.shortName.trim();
  let name = orderedConditions(rule).slice(0, 2).map(compactConditionText).join("; ");
  if (name.length > 48) name = name.replace("Latest statement:", "Latest:");
  if (name.length > 48) name = name.replace("Credit limit", "Limit");
  return name || "Unspecified conditions";
}

// Intent: keep API and fallback short names identical for captured conditions.
// Status: tested for all representatives and members. Next: retain long-form
// condition tooltips. Blockers: none. Confidence: captured sample parity tests.
function compactConditionText(condition: RuleCondition): string {
  const { attribute, operator = "=", unit } = condition;
  const fullLabel = RULE_ATTRIBUTE_LABELS[attribute] ?? condition.label ?? attribute;
  const label =
    attribute === "PAY_1"
      ? "Latest statement"
      : /^PAY_[1-6]$/.test(attribute)
        ? fullLabel.replace(/ status$/, "")
        : fullLabel;
  let value = String(condition.value)
    .trim()
    .replace(/^[\'"]|[\'"]$/g, "");
  if (operator !== "=" && operator !== "in") value = `${operator}${value}`;
  const interval = value.match(/^[[(](-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?|inf)[\])]$/);
  if (interval)
    value = interval[2] === "inf" ? `>=${interval[1]}` : `${interval[1]}-${interval[2]}`;
  if (STATUS_FIELDS.has(attribute)) {
    if (value === "<=0") value = "no delay";
    else if (value === ">=3" || value === "3+")
      value = attribute === "MAX_DELAY" ? "3+ months" : "3+ months late";
    else if (/^-?\d+$/.test(value)) {
      const statuses: Record<string, string> = {
        "-2": "no use",
        "-1": "paid in full",
        "0": "revolving",
      };
      value =
        statuses[value] ??
        `${Number(value) >= 3 ? "3+" : value} ${value === "1" ? "month" : "months"}${attribute === "MAX_DELAY" ? "" : " late"}`;
    } else return conditionText(condition);
    return `${attribute === "MAX_DELAY" ? "Longest delay" : label}: ${value}`;
  } else if (attribute === "MONTHS_DELAYED") {
    return `Late in ${value.replace(/^>=/, "")}${value.startsWith(">=") ? "+" : ""} of 6 months`;
  } else if (attribute === "LIMIT_BAL" && !value.includes("inf")) {
    const compactNt = (amount: string) => `${formatInt(Math.floor(Number(amount) / 1000))}k`;
    const range = value.match(/^(\d+)-(\d+)$/);
    const bound = value.match(/^(<=|>=|<|>)?(\d+)$/);
    if (range) value = `NT$${compactNt(range[1])}-${compactNt(range[2])}`;
    else if (bound) value = `${bound[1] ? `${bound[1]} ` : ""}NT$${compactNt(bound[2])}`;
    else return conditionText(condition);
    return `Credit limit ${value}`;
  } else if (attribute === "AVG_UTILIZATION" || attribute === "PAY_RATIO") {
    if (!value.endsWith("%")) value += "%";
    if (attribute === "AVG_UTILIZATION") return value === "<=0%"
      ? "No balance (utilization <= 0%)" : `Utilization ${value}`;
    return `Pays ${value.replace(/^>=/, ">= ")} of bills`;
  } else if (["SEX", "EDUCATION", "MARRIAGE"].includes(attribute) && operator === "=") {
    return friendlyRuleValue(value, attribute);
  } else if (attribute === "AGE") return `Age ${value}`;
  else if (unit === "%" && !value.endsWith("%")) value += "%";
  else if (operator === "!=" || (operator === "in" && !interval)) return conditionText(condition);
  return `${label}: ${value}`;
}

/** Intent: rank supported bases and compare real condition levels only.
 * Status: complete. Next: retain sample coverage. Blockers: none.
 * Confidence: API order, support boundary and synthetic exclusion are tested.
 */
export function strongestDefaultFamily(families: RuleFamily[]): RuleFamily | undefined {
  return families
    .filter((family) => family.baseRule && family.baseRule.support >= 0.02)
    .sort((a, b) => b.baseRule!.lift - a.baseRule!.lift)[0];
}

export function filterRuleFamilies(families: RuleFamily[], minLift: number): RuleFamily[] {
  return families.filter((family) =>
    family.baseRule ? family.baseRule.lift >= minLift : minLift === 1,
  );
}

export function ruleLadders(families: RuleFamily[], groups: RuleFamiliesResponse["groups"]) {
  const conditionValue = (family: RuleFamily) => {
    const value = String(
      family.baseRule!.conditions?.find((condition) => condition.attribute === family.attribute)
        ?.value ?? "",
    );
    return Number(value.match(/-?\d+(?:\.\d+)?/)?.[0] ?? 0);
  };
  return groups
    .map((group) => ({
      ...group,
      families: families
        .filter((family) => family.baseRule && group.familyIds.includes(family.familyId))
        .sort((a, b) => conditionValue(a) - conditionValue(b)),
    }))
    .filter((group) => group.families.length >= 2);
}
