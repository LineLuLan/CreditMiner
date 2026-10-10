import type { Cluster, PcaPoint } from "@/types/api.types";

export const finiteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function safeRatio(value: number | null | undefined, baseline: number | null | undefined) {
  return finiteNumber(value) && finiteNumber(baseline) && baseline > 0 ? value / baseline : null;
}

export function riskAboveBaseline(
  rate: number | null | undefined,
  baseline: number | null | undefined,
) {
  return finiteNumber(rate) && finiteNumber(baseline) && rate > baseline;
}

// Choose concentrated risk; shares use every nonempty segment, never a partial denominator.
export function clusterInsight(clusters: Cluster[], portfolioCount?: number) {
  const valid = clusters.filter(
    (cluster) =>
      finiteNumber(cluster.size) &&
      cluster.size > 0 &&
      finiteNumber(cluster.defaultRate) &&
      cluster.defaultRate >= 0 &&
      cluster.defaultRate <= 1,
  );
  if (!valid.length || valid.length !== clusters.filter((cluster) => cluster.size !== 0).length)
    return null;
  const cluster = valid.reduce((highest, current) =>
    current.defaultRate > highest.defaultRate ? current : highest,
  );
  const totalClients = valid.reduce((sum, current) => sum + current.size, 0);
  const totalDefaults = valid.reduce((sum, current) => sum + current.size * current.defaultRate, 0);
  return {
    cluster,
    clientShare: cluster.shareOfClients ?? safeRatio(cluster.size, portfolioCount ?? totalClients),
    defaultShare:
      cluster.shareOfDefaults ?? safeRatio(cluster.size * cluster.defaultRate, totalDefaults),
  };
}

/**
 * Intent: keep outliers from compressing the PCA while preserving an honest disclosure.
 * Status: API metadata owns central bounds and counts; the legacy fallback computes
 * p1/p99 from all finite points before sampling. Full range remains client-derived.
 * Next: retain this ordering when sampling changes. Blockers: none.
 * Confidence: tested against API metadata, interpolated, constant, empty, and full-range inputs.
 */
export function pcaView(
  points: PcaPoint[],
  fullRange: boolean,
  meta?: {
    zoomBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
    outsideCount: number;
  },
) {
  const valid = points.filter((point) => finiteNumber(point.x) && finiteNumber(point.y));
  function axisDomain(key: "x" | "y"): [number, number] {
    if (!valid.length) return [-1, 1];
    const sorted = valid.map((point) => point[key]).sort((a, b) => a - b);
    const quantile = (fraction: number) => {
      const position = (sorted.length - 1) * fraction;
      const lower = Math.floor(position);
      const upper = Math.ceil(position);
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
    };
    const low = fullRange ? sorted[0] : quantile(0.01);
    const high = fullRange ? sorted[sorted.length - 1] : quantile(0.99);
    return low === high ? [low - 1, high + 1] : [low, high];
  }
  const xDomain: [number, number] =
    !fullRange && meta ? [meta.zoomBounds.xMin, meta.zoomBounds.xMax] : axisDomain("x");
  const yDomain: [number, number] =
    !fullRange && meta ? [meta.zoomBounds.yMin, meta.zoomBounds.yMax] : axisDomain("y");
  const visible = valid.filter(
    (point) =>
      point.x >= xDomain[0] &&
      point.x <= xDomain[1] &&
      point.y >= yDomain[0] &&
      point.y <= yDomain[1],
  );
  return {
    xDomain,
    yDomain,
    points: visible,
    outsideCount: !fullRange && meta ? meta.outsideCount : valid.length - visible.length,
    invalidCount: points.length - valid.length,
  };
}
