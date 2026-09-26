const RULE_FIELD_LABELS: Record<string, string> = {
  Attrition_Flag: "Attrition status",
  Avg_Utilization_Ratio: "Utilization",
  Card_Category: "Card tier",
  Credit_Limit: "Credit limit",
  Gender: "Gender",
  Income_Category: "Income Category",
  Risk_Score: "Risk Score",
  Total_Revolving_Bal: "Revolving balance",
  Total_Relationship_Count: "Relationship count",
  Total_Trans_Amt: "Transaction amount",
  Total_Trans_Ct: "Transaction count",
};

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
      condition.label === "Gender" || condition.label === "Condition"
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
        label: RULE_FIELD_LABELS[field] ?? field.replaceAll("_", " "),
        value: friendlyRuleValue(rawValue, field),
      };
    });
}

export function friendlyRuleValue(value: string, field?: string): string {
  const cleanValue = value.trim().replace(/^['"]|['"]$/g, "");

  if (field === "Gender") {
    if (cleanValue === "F") return "Female";
    if (cleanValue === "M") return "Male";
  }

  if (field === "Card_Category" && cleanValue === "Blue") return "Blue card";
  if (cleanValue === "Existing Customer") return "Existing customer";
  if (cleanValue === "Attrited Customer") return "Attrited customer";

  const upperBound = cleanValue.match(/^\(-inf-([\d.]+)\]$/);
  if (upperBound) return `up to ${formatRuleNumber(upperBound[1])}`;

  const lowerBound = cleanValue.match(/^\(([\d.]+)-inf\)$/);
  if (lowerBound) return `above ${formatRuleNumber(lowerBound[1])}`;

  const range = cleanValue.match(/^\(([\d.]+)-([\d.]+)\]$/);
  if (range) return `${formatRuleNumber(range[1])} to ${formatRuleNumber(range[2])}`;

  return cleanValue.replaceAll("_", " ");
}

function formatRuleNumber(value: string): string {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: numericValue >= 100 ? 0 : 1,
  }).format(numericValue);
}
