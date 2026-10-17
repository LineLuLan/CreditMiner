type NumericValue = number | null | undefined;

/**
 * Intent: keep dashboard units, rounding, and missing values consistent.
 * Status: shared formatters cover currency, counts, ratios, and durations.
 * Next: use these helpers for new numeric presentation. Blockers: none.
 * Confidence: covered by focused formatter and rule-threshold tests.
 */
function isFiniteNumber(value: NumericValue): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Rounded integer with thousands separators. */
export function formatInt(value: NumericValue): string {
  return isFiniteNumber(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
    : "n/a";
}

export const formatCount = formatInt;

export function formatNt(value: NumericValue): string {
  return isFiniteNumber(value) ? `${value < 0 ? "-" : ""}NT$${formatInt(Math.abs(value))}` : "n/a";
}

/** Ratios are fractions (0.563), not already-scaled percentages (56.3). */
export function formatPct(value: NumericValue, digits = 1): string {
  return isFiniteNumber(value)
    ? new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value)
    : "n/a";
}

export function formatPct1(value: NumericValue): string {
  return formatPct(value, 1);
}

/** Fraction differences expressed as percentage points, without signed zero. */
export function formatDeltaPp(delta: number | null): string {
  if (!isFiniteNumber(delta)) return "n/a";
  if (Math.abs(delta) < 0.00005) return "no change (0.00 pp)";
  return `${delta > 0 ? "+" : "-"}${formatDecimal(Math.abs(delta) * 100, 2)} pp`;
}

export const formatRatio = formatPct1;

export function formatDecimal(value: NumericValue, digits = 2): string {
  return isFiniteNumber(value)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value)
    : "n/a";
}

export function formatMultiplier(value: NumericValue): string {
  return isFiniteNumber(value) ? `${formatDecimal(value, 1)}x base` : "n/a";
}

/** Durations retain zero; legacy centroid code averages must be disclosed by callers. */
export function formatDelayMonths(value: NumericValue): string {
  if (!isFiniteNumber(value)) return "n/a";
  return `${formatDecimal(value, 1)} months`;
}

export function formatCvF1Change(delta: NumericValue, algorithm = "RANDOMFOREST"): string {
  if (!isFiniteNumber(delta)) return "n/a";
  const name = algorithm === "RANDOMFOREST" ? "Random forest"
    : algorithm === "DECISIONTREE" || algorithm === "J48" ? "J48" : algorithm;
  const change = Math.abs(delta) < 0.00005
    ? "leaves CV F1 unchanged (0.00 pp)"
    : `changes CV F1 by ${formatDeltaPp(delta)}`;
  return `Adding the pattern features ${change} for ${name}.`;
}

export function formatMs(value: NumericValue): string {
  return isFiniteNumber(value) ? `${formatInt(value)} ms` : "n/a";
}
