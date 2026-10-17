import { formatInt } from "./format";

export const SEQUENCE_ITEMS: Record<string, string> = {
  NO_USE: "no card use",
  PAID_FULL: "paid in full",
  REVOLVING: "revolving",
  LATE_1: "1 month late",
  LATE_2: "2 months late",
  LATE_3PLUS: "3+ months late",
  NONE: "no payment",
  PARTIAL: "partial payment",
  COVERED: "bill covered",
  NO_BALANCE: "no balance",
};

type PatternInput = {
  pattern: string;
  displayText?: string;
  steps?: { items: string[]; sameMonth?: boolean; repeat?: number }[];
};

export type HumanisedPattern = {
  text: string;
  steps: { items: string[]; sameMonth: boolean }[];
};

/**
 * Intent: preserve GSP month ordering while making itemsets readable.
 * Status: handles API labels/steps and run-length display; next: retain this contract.
 * Blockers: none. Confidence: grammar and API precedence have focused tests.
 */
export function humanisePattern(input: string | PatternInput): HumanisedPattern {
  const source = typeof input === "string" ? { pattern: input } : input;
  const raw = source.pattern.trim();
  const parsed: NonNullable<PatternInput["steps"]> = /^<\s*(?:\{[^{}]*\}\s*)*>$/.test(raw)
    ? Array.from(raw.matchAll(/\{([^{}]*)\}/g), ([, items]) => ({ items: items.split(",") }))
    : [];
  const steps = (source.steps?.length ? source.steps : parsed)
    .flatMap((step) => {
      const items = step.items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) =>
          Object.prototype.hasOwnProperty.call(SEQUENCE_ITEMS, item) ? SEQUENCE_ITEMS[item] : item,
        );
      const repeat = Number.isInteger(step.repeat) && (step.repeat ?? 0) > 0 ? step.repeat! : 1;
      return Array.from({ length: repeat }, () => ({ items, sameMonth: items.length > 1 }));
    })
    .filter((step) => step.items.length > 0);
  const runs: { key: string; text: string; count: number; multiple: boolean }[] = [];
  for (const step of steps) {
    const key = JSON.stringify([...step.items].sort());
    const previous = runs[runs.length - 1];
    if (previous?.key === key) previous.count += 1;
    else runs.push({ key, text: step.items.join(" + "), count: 1, multiple: step.sameMonth });
  }
  const text = runs
    .map((run) =>
      run.count === 1
        ? run.text
        : `${run.multiple ? `(${run.text})` : run.text} x${formatInt(run.count)}`,
    )
    .join(", then ");
  return {
    text:
      source.displayText?.trim() ||
      (text ? text.charAt(0).toUpperCase() + text.slice(1) : "Pattern unavailable"),
    steps,
  };
}

/** Curated API order is authoritative; an explicitly empty story list stays empty. */
export function selectSequenceStories<T>(artifact: {
  stories?: { defaultStories?: T[]; nonDefaultStories?: T[] };
  topDefaultPatterns: T[];
  topNonDefaultPatterns: T[];
}): { defaultStories: T[]; nonDefaultStories: T[] } {
  return {
    defaultStories: artifact.stories?.defaultStories ?? artifact.topDefaultPatterns,
    nonDefaultStories: artifact.stories?.nonDefaultStories ?? artifact.topNonDefaultPatterns,
  };
}

/** Preserve all API patterns; legacy lists are combined without duplicate exact patterns. */
export function selectAllSequencePatterns<T extends { pattern: string }>(artifact: {
  patterns?: T[];
  topDefaultPatterns: T[];
  topNonDefaultPatterns: T[];
}): T[] {
  return artifact.patterns ?? Array.from(new Map(
    [...artifact.topDefaultPatterns, ...artifact.topNonDefaultPatterns]
      .map((pattern) => [pattern.pattern, pattern]),
  ).values());
}

export function deduplicatePatterns<
  T extends PatternInput & { ratio: number; groupPrevalenceRatio?: number },
>(patterns: T[], limit: number): T[] {
  const unique = new Map<string, T>();
  for (const pattern of patterns) {
    const key = humanisePattern({ ...pattern, displayText: undefined }).text;
    const existing = unique.get(key);
    if (
      !existing ||
      (pattern.groupPrevalenceRatio ?? pattern.ratio) >
        (existing.groupPrevalenceRatio ?? existing.ratio)
    ) {
      unique.set(key, pattern);
    }
  }
  return Array.from(unique.values()).slice(0, limit);
}

export function matchedCvComparison(
  rows: { algo: string; features: string; cv: { f1: number } }[],
): { algo: string; delta: number } | null {
  const algorithms = Array.from(new Set(["RANDOMFOREST", ...rows.map((row) => row.algo)]));
  for (const algo of algorithms) {
    const base = rows.find((row) => row.algo === algo && row.features === "base");
    const augmented = rows.find((row) => row.algo === algo && row.features === "base+seq");
    if (base && augmented) return { algo, delta: augmented.cv.f1 - base.cv.f1 };
  }
  return null;
}
