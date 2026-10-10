import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes intelligently (deduping conflicts). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatInt, formatPct } from "@/lib/format";

/** Format a USD currency amount (e.g. $12,500). */
export function formatUsd(amount: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

/** Round to N decimals (e.g. 0.06432 -> 0.064). */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Linearly map a value in [0,1] to a 'severity' bucket. */
export function severity(score: number): "low" | "medium" | "high" {
  if (score < 0.33) return "low";
  if (score < 0.66) return "medium";
  return "high";
}
