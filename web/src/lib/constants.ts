/** Centralized constants. Avoid magic strings and numbers in components. */

/** Frontend API base URL. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CreditMiner";

export const DATASET_SOURCE =
  "UCI Machine Learning Repository, dataset 350 (Yeh & Lien, 2009), 30,000 clients, Taiwan, April-September 2005";

/** Display order for the Phase 6 k=2 personas. */
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
  UTILIZATION_1: "September utilization",
  AVG_UTILIZATION: "Average utilization",
  PAY_RATIO: "Payment ratio",
  MONTHS_DELAYED: "Months delayed",
  MAX_DELAY: "Maximum repayment delay",
  BILL_TREND: "Bill trend",
  RISK_TIER: "Risk tier",
};

export const COLUMN_LABELS = EDA_FIELD_LABELS;

/** Compact labels for dense chart axes. */
export const EDA_FIELD_SHORT_LABELS: Record<string, string> = {
  ID: "Client ID",
  LIMIT_BAL: "Limit",
  SEX: "Sex",
  EDUCATION: "Education",
  MARRIAGE: "Marriage",
  AGE: "Age",
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
  UTILIZATION_1: "Utilization Sep",
  AVG_UTILIZATION: "Avg utilization",
  PAY_RATIO: "Pay ratio",
  MONTHS_DELAYED: "Months delayed",
  MAX_DELAY: "Max delay",
  BILL_TREND: "Bill trend",
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

export const CATEGORY_LABELS = {
  SEX: { Male: "Male", Female: "Female" },
  EDUCATION: {
    Graduate: "Graduate",
    University: "University",
    HighSchool: "High school",
    Other: "Other",
  },
  MARRIAGE: { Married: "Married", Single: "Single", Other: "Other" },
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
  { href: "/eda", label: "EDA", icon: "BarChart3" },
  { href: "/customers", label: "Customers", icon: "Users" },
  { href: "/clusters", label: "Clusters", icon: "Network" },
  { href: "/rules", label: "Rules", icon: "Filter" },
  { href: "/sequences", label: "Sequences", icon: "GitBranch" },
  { href: "/mining-report", label: "Mining Report", icon: "FileText" },
  { href: "/pipeline", label: "Methodology", icon: "GitBranch" },
  { href: "/predict", label: "Predict", icon: "Sparkles" },
  { href: "/insights", label: "Insights", icon: "Lightbulb" },
] as const;

export { CHART_SEMANTIC, CLUSTER_COLORS, clusterColor } from "./chart-theme";
