import { formatPct } from "@/lib/utils";
import type { Methodology } from "@/types/api.types";

export function imputationSentence(preprocessing: Methodology["preprocessing"]): string {
  return Object.keys(preprocessing?.numericMedianImputed ?? {}).length > 0
    ? "Numeric gaps use median values."
    : "No numeric imputation was recorded.";
}

export function metricText(value: number | null | undefined, digits: number): string {
  return value == null ? "unavailable" : formatPct(value, digits);
}

export const DEFAULT_SELECTION_RULE = "F1 for the default class first, ROC AUC as the tiebreaker";
