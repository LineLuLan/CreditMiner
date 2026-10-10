export type BinningMode = "equal" | "quantile" | "log";
interface DistributionBins {
  type: string;
  binEdges: number[];
  counts: number[];
  categories?: string[];
  series?: { label: string; counts: number[] }[] | null;
}

/**
 * Intent: reduce sparse tails and compare class rates without manufacturing observations.
 * Status: whole source bins are merged; quantiles/log boundaries are approximate.
 * Next: use raw values if the API gains an exact quantile endpoint. Blocker: only counts available.
 * Confidence: conservation, signed ranges, empty inputs and tail boundaries tested.
 */
export function regroupDistribution<T extends DistributionBins>(source: T, mode: BinningMode) {
  const { counts, binEdges } = source;
  const total = counts.reduce((sum, count) => sum + count, 0);
  const valid = source.type === "numeric" && binEdges.length === counts.length + 1 &&
    binEdges.every((edge, i) => Number.isFinite(edge) && (i === 0 || edge > binEdges[i - 1]));
  if (!valid || total <= 0) return { ...source, tail: null, approximate: false };
  let tailStart = counts.length;
  while (tailStart > 1 && counts[tailStart - 1] < total * 0.001) tailStart--;
  const tail = tailStart < counts.length ? {
    start: binEdges[tailStart], count: counts.slice(tailStart).reduce((sum, count) => sum + count, 0),
  } : null;
  const cuts = new Set([0, tailStart]);
  if (mode === "equal") {
    for (let i = 1; i < tailStart; i++) cuts.add(i);
  } else {
    const cumulative = [0];
    for (let i = 0; i < tailStart; i++) cumulative.push(cumulative[i] + counts[i]);
    const signedLog = (value: number) => Math.sign(value) * Math.log1p(Math.abs(value));
    const positions = mode === "quantile" ? cumulative : binEdges.slice(0, tailStart + 1).map(signedLog);
    for (let step = 1; step < 10; step++) {
      const target = positions[0] + (positions[tailStart] - positions[0]) * step / 10;
      let nearest = 0;
      for (let i = 1; i <= tailStart; i++) {
        if (Math.abs(positions[i] - target) < Math.abs(positions[nearest] - target)) nearest = i;
      }
      cuts.add(nearest);
    }
  }
  if (tail) cuts.add(counts.length);
  const edges = [...cuts].sort((a, b) => a - b);
  const aggregate = (values: number[]) => edges.slice(0, -1).map((start, i) =>
    values.slice(start, edges[i + 1]).reduce((sum, count) => sum + count, 0));
  return {
    ...source,
    binEdges: edges.map((index) => binEdges[index]),
    counts: aggregate(counts),
    series: source.series?.map((item) => ({ ...item, counts: aggregate(item.counts) })),
    tail,
    approximate: mode !== "equal",
  };
}

export function hasCompleteClassSeries(counts: number[], series?: { label: string; counts: number[] }[] | null): boolean {
  const defaults = series?.find((item) => item.label === "Yes" || item.label === "Default");
  const nonDefaults = series?.find((item) => item.label === "No" || item.label === "Non-default");
  return !!defaults && !!nonDefaults && defaults.counts.length === counts.length &&
    nonDefaults.counts.length === counts.length &&
    counts.every((count, i) => defaults.counts[i] + nonDefaults.counts[i] === count);
}
