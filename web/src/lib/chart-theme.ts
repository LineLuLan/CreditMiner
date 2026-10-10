/** Shared semantic colours; risk is derived from rates, never cluster IDs. */
export const CHART_SEMANTIC = {
  danger: "hsl(var(--danger))",
  success: "hsl(var(--success))",
  neutral: "hsl(var(--chart-neutral))",
  baseline: "hsl(var(--chart-baseline))",
  primary: "hsl(var(--primary))",
} as const;

/** Compatibility palette for categorical callers without default-rate evidence. */
export const CLUSTER_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

/**
 * Intent: use observed risk relative to a supplied baseline.
 * Status: complete; next: keep new risk-aware callers on this helper.
 * Blockers: none; confidence: high, with missing and non-finite rates tested.
 */
export function clusterColor(
  defaultRate: number | null | undefined,
  baselineRate: number | null | undefined,
): string {
  if (
    defaultRate == null ||
    baselineRate == null ||
    !Number.isFinite(defaultRate) ||
    !Number.isFinite(baselineRate)
  ) {
    return CHART_SEMANTIC.neutral;
  }
  if (defaultRate > baselineRate) return CHART_SEMANTIC.danger;
  return CHART_SEMANTIC.neutral;
}
