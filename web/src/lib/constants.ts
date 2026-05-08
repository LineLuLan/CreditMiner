/** Centralized constants. Avoid magic strings/numbers in components. */

/** Frontend API base URL. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Default page size for paginated tables. */
export const DEFAULT_PAGE_SIZE = 20;

/** Page sizes available in size selectors. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** App brand name. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CreditMiner";

/** Persona display order. */
export const PERSONA_ORDER = [
  "Premium Loyal",
  "High-Risk Spenders",
  "Average Active",
  "Dormant",
] as const;

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

/** Categorical dimensions for /churn-by. */
export const CHURN_BY_DIMS = [
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
  { href: "/predict", label: "Predict", icon: "Sparkles" },
  { href: "/insights", label: "Insights", icon: "Lightbulb" },
] as const;

/** Color palette for clusters (consistent across charts). */
export const CLUSTER_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f97316", // orange
  "#a855f7", // purple
] as const;
