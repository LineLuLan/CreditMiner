/** Centralized constants. Avoid magic strings/numbers in components. */

/** Frontend API base URL. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Default page size for paginated tables. */
export const DEFAULT_PAGE_SIZE = 20;

/** Page sizes available in size selectors. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** App brand name. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CreditMiner";

/** Persona display order — matches BE Phase 6 cluster names (k=3). */
export const PERSONA_ORDER = ["Premium Loyal", "At-Risk Mid-Tier", "Low-Income Stable"] as const;

/** Customer tier order. */
export const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum"] as const;

/** Numeric EDA columns (mirrors what backend supports). */
export const EDA_NUMERIC_COLS = [
  "Customer_Age",
  "Credit_Limit",
  "Total_Trans_Amt",
  "Total_Trans_Ct",
  "Avg_Utilization_Ratio",
  "Risk_Score",
  "Customer_Value_Score",
] as const;

/** Human-readable labels for EDA controls and correlation summaries. */
export const EDA_FIELD_LABELS: Record<string, string> = {
  Customer_Age: "Customer age",
  Dependent_count: "Dependent count",
  Months_on_book: "Months on book",
  Total_Relationship_Count: "Total relationship count",
  Months_Inactive_12_mon: "Inactive months in last year",
  Contacts_Count_12_mon: "Contacts in last year",
  Credit_Limit: "Credit limit",
  Total_Revolving_Bal: "Total revolving balance",
  Avg_Open_To_Buy: "Average open to buy",
  Total_Amt_Chng_Q4_Q1: "Transaction amount change Q4/Q1",
  Total_Trans_Amt: "Total transaction amount",
  Total_Trans_Ct: "Total transaction count",
  Total_Ct_Chng_Q4_Q1: "Transaction count change Q4/Q1",
  Avg_Utilization_Ratio: "Average utilization ratio",
  Utilization_Score: "Utilization score",
  Spending_Intensity: "Spending intensity",
  Engagement_Score: "Engagement score",
  Customer_Value_Score: "Customer value score",
  Risk_Score: "Risk score",
  Income_Category: "Income category",
  Card_Category: "Card category",
  Customer_Tier: "Customer tier",
  Gender: "Gender",
  Education_Level: "Education level",
  Marital_Status: "Marital status",
};

/** Compact labels keep dense correlation axes readable. */
export const EDA_FIELD_SHORT_LABELS: Record<string, string> = {
  Customer_Age: "Age",
  Dependent_count: "Dependents",
  Months_on_book: "Tenure",
  Total_Relationship_Count: "Products",
  Months_Inactive_12_mon: "Inactive",
  Contacts_Count_12_mon: "Contacts",
  Credit_Limit: "Limit",
  Total_Revolving_Bal: "Revolving",
  Avg_Open_To_Buy: "Open to buy",
  Total_Amt_Chng_Q4_Q1: "Amount change",
  Total_Trans_Amt: "Txn amount",
  Total_Trans_Ct: "Txn count",
  Total_Ct_Chng_Q4_Q1: "Count change",
  Avg_Utilization_Ratio: "Utilization",
  Utilization_Score: "Util score",
  Spending_Intensity: "Spending",
  Engagement_Score: "Engagement",
  Customer_Value_Score: "Value score",
  Risk_Score: "Risk score",
};

/** Categorical dimensions for /churn-by. */
export const CHURN_BY_DIMS = [
  "Months_Inactive_12_mon",
  "Contacts_Count_12_mon",
  "Total_Relationship_Count",
  "Dependent_count",
  "Income_Category",
  "Card_Category",
  "Customer_Tier",
  "Gender",
  "Education_Level",
  "Marital_Status",
] as const;

/** Sidebar nav items. */
export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "LayoutDashboard" },
  { href: "/eda", label: "EDA", icon: "BarChart3" },
  { href: "/customers", label: "Customers", icon: "Users" },
  { href: "/clusters", label: "Clusters", icon: "Network" },
  { href: "/rules", label: "Rules", icon: "Filter" },
  { href: "/mining-report", label: "Mining Report", icon: "FileText" },
  { href: "/pipeline", label: "Methodology", icon: "GitBranch" },
  { href: "/predict", label: "Predict", icon: "Sparkles" },
  { href: "/insights", label: "Insights", icon: "Lightbulb" },
] as const;

/**
 * Color palette for clusters (consistent across charts).
 * Backed by CSS variables (--chart-*) so colors adapt to light/dark themes.
 * Tuned in globals.css to match the original blue/emerald/orange/purple set.
 */
export const CLUSTER_COLORS = [
  "hsl(var(--chart-1))", // blue
  "hsl(var(--chart-2))", // emerald
  "hsl(var(--chart-3))", // orange
  "hsl(var(--chart-4))", // purple
  "hsl(var(--chart-5))", // sky
] as const;
