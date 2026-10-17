/** Centralized constants. Avoid magic strings and numbers in components. */

/** Frontend API base URL. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CreditMiner";

export const DATASET_SOURCE =
  "UCI Machine Learning Repository, dataset 350 (Yeh & Lien, 2009), 30,000 clients, Taiwan, April-September 2005";

/** Display order for the Phase 6 personas. */
export const PERSONA_ORDER = [
  "High-Default Persistent Delayers",
  "Lower-Default Current Payers",
] as const;

export const RISK_TIER_ORDER = ["Low", "Medium", "High"] as const;

/** Numeric columns returned by the correlation endpoint. */
export const EDA_NUMERIC_COLS = [
  "LIMIT_BAL",
  "AGE",
  "PAY_1",
  "PAY_2",
  "PAY_3",
  "PAY_4",
  "PAY_5",
  "PAY_6",
  "BILL_AMT1",
  "BILL_AMT2",
  "BILL_AMT3",
  "BILL_AMT4",
  "BILL_AMT5",
  "BILL_AMT6",
  "PAY_AMT1",
  "PAY_AMT2",
  "PAY_AMT3",
  "PAY_AMT4",
  "PAY_AMT5",
  "PAY_AMT6",
  "UTILIZATION_1",
  "AVG_UTILIZATION",
  "PAY_RATIO",
  "MONTHS_DELAYED",
  "MAX_DELAY",
  "BILL_TREND",
] as const;

/** Product labels for model features; unknown features retain their source code. */
export const FEATURE_LABELS: Record<string, string> = {
  PAY_1: "Latest statement status (Sep)",
  PAY_2: "Status, Aug",
  PAY_3: "Status, Jul",
  PAY_4: "Status, Jun",
  PAY_5: "Status, May",
  PAY_6: "Status, Apr",
  LIMIT_BAL: "Credit limit",
  AGE: "Age",
  SEX: "Sex",
  EDUCATION: "Education",
  MARRIAGE: "Marital status",
  BILL_AMT1: "Bill, Sep",
  BILL_AMT2: "Bill, Aug",
  BILL_AMT3: "Bill, Jul",
  BILL_AMT4: "Bill, Jun",
  BILL_AMT5: "Bill, May",
  BILL_AMT6: "Bill, Apr",
  PAY_AMT1: "Payment, Sep",
  PAY_AMT2: "Payment, Aug",
  PAY_AMT3: "Payment, Jul",
  PAY_AMT4: "Payment, Jun",
  PAY_AMT5: "Payment, May",
  PAY_AMT6: "Payment, Apr",
  UTILIZATION_1: "Utilization, Sep",
  AVG_UTILIZATION: "Average utilization",
  PAY_RATIO: "Payment ratio",
  MONTHS_DELAYED: "Late months (of 6)",
  MAX_DELAY: "Longest delay",
  BILL_TREND: "Bill trend",
  RISK_TIER: "Risk tier",
};

export function featureLabel(code: string): string {
  return FEATURE_LABELS[code] ?? code;
}

/** Labels for every raw and engineered dataset column. */
export const EDA_FIELD_LABELS: Record<string, string> = {
  ID: "Client ID",
  LIMIT_BAL: "Credit limit",
  SEX: "Sex",
  EDUCATION: "Education",
  MARRIAGE: "Marital status",
  AGE: "Age",
  PAY_1: "Repayment status, September 2005",
  PAY_2: "Repayment status, August 2005",
  PAY_3: "Repayment status, July 2005",
  PAY_4: "Repayment status, June 2005",
  PAY_5: "Repayment status, May 2005",
  PAY_6: "Repayment status, April 2005",
  BILL_AMT1: "Bill amount, September 2005",
  BILL_AMT2: "Bill amount, August 2005",
  BILL_AMT3: "Bill amount, July 2005",
  BILL_AMT4: "Bill amount, June 2005",
  BILL_AMT5: "Bill amount, May 2005",
  BILL_AMT6: "Bill amount, April 2005",
  PAY_AMT1: "Payment amount, September 2005",
  PAY_AMT2: "Payment amount, August 2005",
  PAY_AMT3: "Payment amount, July 2005",
  PAY_AMT4: "Payment amount, June 2005",
  PAY_AMT5: "Payment amount, May 2005",
  PAY_AMT6: "Payment amount, April 2005",
  Default: "Default payment next month",
  UTILIZATION_1: FEATURE_LABELS.UTILIZATION_1,
  AVG_UTILIZATION: "Average utilization",
  PAY_RATIO: "Payment ratio",
  MONTHS_DELAYED: FEATURE_LABELS.MONTHS_DELAYED,
  MAX_DELAY: FEATURE_LABELS.MAX_DELAY,
  BILL_TREND: "Bill trend",
  RISK_TIER: "Risk tier",
  ...FEATURE_LABELS,
};

export const COLUMN_LABELS = EDA_FIELD_LABELS;

/** Compact labels for dense chart axes. */
export const EDA_FIELD_SHORT_LABELS: Record<string, string> = {
  ID: "Client ID",
  LIMIT_BAL: FEATURE_LABELS.LIMIT_BAL,
  SEX: "Sex",
  EDUCATION: "Education",
  MARRIAGE: "Marriage",
  AGE: FEATURE_LABELS.AGE,
  PAY_1: "Status Sep",
  PAY_2: "Status Aug",
  PAY_3: "Status Jul",
  PAY_4: "Status Jun",
  PAY_5: "Status May",
  PAY_6: "Status Apr",
  BILL_AMT1: "Bill Sep",
  BILL_AMT2: "Bill Aug",
  BILL_AMT3: "Bill Jul",
  BILL_AMT4: "Bill Jun",
  BILL_AMT5: "Bill May",
  BILL_AMT6: "Bill Apr",
  PAY_AMT1: "Paid Sep",
  PAY_AMT2: "Paid Aug",
  PAY_AMT3: "Paid Jul",
  PAY_AMT4: "Paid Jun",
  PAY_AMT5: "Paid May",
  PAY_AMT6: "Paid Apr",
  Default: "Default",
  UTILIZATION_1: FEATURE_LABELS.UTILIZATION_1,
  AVG_UTILIZATION: FEATURE_LABELS.AVG_UTILIZATION,
  PAY_RATIO: FEATURE_LABELS.PAY_RATIO,
  MONTHS_DELAYED: FEATURE_LABELS.MONTHS_DELAYED,
  MAX_DELAY: FEATURE_LABELS.MAX_DELAY,
  BILL_TREND: FEATURE_LABELS.BILL_TREND,
  RISK_TIER: "Risk tier",
};

/** Units for every raw and engineered dataset column. */
export const EDA_FIELD_UNITS: Record<string, string> = {
  ID: "identifier",
  LIMIT_BAL: "NT$",
  SEX: "category",
  EDUCATION: "category",
  MARRIAGE: "category",
  AGE: "years",
  PAY_1: "status",
  PAY_2: "status",
  PAY_3: "status",
  PAY_4: "status",
  PAY_5: "status",
  PAY_6: "status",
  BILL_AMT1: "NT$",
  BILL_AMT2: "NT$",
  BILL_AMT3: "NT$",
  BILL_AMT4: "NT$",
  BILL_AMT5: "NT$",
  BILL_AMT6: "NT$",
  PAY_AMT1: "NT$",
  PAY_AMT2: "NT$",
  PAY_AMT3: "NT$",
  PAY_AMT4: "NT$",
  PAY_AMT5: "NT$",
  PAY_AMT6: "NT$",
  Default: "category",
  UTILIZATION_1: "ratio",
  AVG_UTILIZATION: "ratio",
  PAY_RATIO: "ratio",
  MONTHS_DELAYED: "months",
  MAX_DELAY: "months",
  BILL_TREND: "ratio",
  RISK_TIER: "category",
};

export const COLUMN_UNITS = EDA_FIELD_UNITS;

export const DEFAULT_BY_DIMS = [
  "SEX",
  "EDUCATION",
  "MARRIAGE",
  "RISK_TIER",
  "PAY_1",
  "PAY_2",
  "PAY_3",
  "PAY_4",
  "PAY_5",
  "PAY_6",
  "MONTHS_DELAYED",
  "AGE",
] as const;

export const PAY_STATUS_OPTIONS = [
  { value: -2, label: "No use" },
  { value: -1, label: "Paid in full" },
  { value: 0, label: "Revolving" },
  { value: 1, label: "1 month late" },
  { value: 2, label: "2 months late" },
  { value: 3, label: "3 months late" },
  { value: 4, label: "4 months late" },
  { value: 5, label: "5 months late" },
  { value: 6, label: "6 months late" },
  { value: 7, label: "7 months late" },
  { value: 8, label: "8 months late" },
] as const;

export const PAY_STATUS_LABELS: Readonly<Record<number, string>> = Object.fromEntries(
  PAY_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
);

export const EDUCATION_LABELS: Record<string, string> = {
  Graduate: "Graduate school", University: "University", HighSchool: "High school", Other: "Other",
};
export const EDUCATION_VALUES = ["Graduate", "University", "HighSchool", "Other"] as const;
export const MARRIAGE_LABELS: Record<string, string> = { Married: "Married", Single: "Single", Other: "Other" };

/** Keep current API traits verbatim, translating only legacy feature prefixes. */
export function formatPersonaTrait(trait: string): string {
  if (Object.values(FEATURE_LABELS).some((label) => trait.startsWith(`${label}:`))) return trait;
  const labels: Record<string, string> = {
    "late months": "MONTHS_DELAYED", "months delayed": "MONTHS_DELAYED",
    "maximum delay": "MAX_DELAY", "maximum repayment delay": "MAX_DELAY",
    "latest utilization": "UTILIZATION_1", "september utilization": "UTILIZATION_1",
    "avg utilization": "AVG_UTILIZATION", "pay ratio": "PAY_RATIO",
    "limit": "LIMIT_BAL",
  };
  const months = trait.match(/^([\d.]+) late months(.*)$/i);
  if (months) return `${featureLabel("MONTHS_DELAYED")}: ${months[1]}${months[2]}`;
  for (const [prefix, code] of Object.entries(labels)) {
    if (trait.toLowerCase().startsWith(`${prefix}:`) || trait.toLowerCase().startsWith(`${prefix} `)) {
      return `${featureLabel(code)}${trait.slice(prefix.length)}`;
    }
  }
  return trait;
}

export const CATEGORY_LABELS = {
  SEX: { Male: "Male", Female: "Female" },
  EDUCATION: EDUCATION_LABELS,
  MARRIAGE: MARRIAGE_LABELS,
  Default: { No: "Non-default", Yes: "Default" },
  RISK_TIER: { Low: "Low", Medium: "Medium", High: "High" },
} as const;

export const RULE_CATEGORY_LABELS = {
  default: "Default",
  "non-default": "Non-default",
} as const;

export const INSIGHT_CATEGORY_LABELS = {
  driver: "Driver",
  segment: "Segment",
  context: "Context",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "LayoutDashboard" },
  { href: "/insights", label: "Insights", icon: "Lightbulb" },
  { href: "/eda", label: "EDA", icon: "BarChart3" },
  { href: "/customers", label: "Customers", icon: "Users" },
  { href: "/clusters", label: "Personas", icon: "Network" },
  { href: "/rules", label: "Rules", icon: "Filter" },
  { href: "/sequences", label: "Sequences", icon: "GitBranch" },
  { href: "/predict", label: "Predict", icon: "Sparkles" },
  { href: "/mining-report", label: "Mining Report", icon: "FileText" },
  { href: "/pipeline", label: "Methodology", icon: "GitBranch" },
] as const;

export { CHART_SEMANTIC, CLUSTER_COLORS, clusterColor } from "./chart-theme";
