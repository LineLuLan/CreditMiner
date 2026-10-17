/** Shared semantic colours; risk is derived from rates, never cluster IDs. */
export const CHART_SEMANTIC = {
  danger: "hsl(var(--danger))",
  warning: "hsl(var(--warning))",
  success: "hsl(var(--success))",
  neutral: "hsl(var(--chart-neutral))",
  neutral2: "hsl(var(--chart-neutral-2))",
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
  lowest = false,
): string {
  if (
    defaultRate == null ||
    baselineRate == null ||
    !Number.isFinite(defaultRate) ||
    !Number.isFinite(baselineRate) ||
    baselineRate <= 0
  ) {
    return CHART_SEMANTIC.neutral;
  }
  return personaColor(defaultRate / baselineRate, lowest);
}

export function personaColor(multiplier: number | null | undefined, lowest = false): string {
  if (multiplier == null || !Number.isFinite(multiplier)) return CHART_SEMANTIC.neutral;
  if (multiplier >= 1.75) return CHART_SEMANTIC.danger;
  if (multiplier >= 1.15) return CHART_SEMANTIC.warning;
  return lowest ? CHART_SEMANTIC.neutral2 : CHART_SEMANTIC.neutral;
}

/** Identity is stable across surfaces; risk badges still use personaColor. */
export function personaIdentityColor(name: string | null | undefined, multiplier?: number | null): string {
  const normalized = name?.toLowerCase();
  if (normalized?.includes("persistent delayer")) return CHART_SEMANTIC.danger;
  if (normalized?.includes("occasional delayer")) return CHART_SEMANTIC.warning;
  if (normalized?.includes("transactor")) return CHART_SEMANTIC.primary;
  if (normalized?.includes("revolver")) return CHART_SEMANTIC.neutral;
  return personaColor(multiplier);
}
