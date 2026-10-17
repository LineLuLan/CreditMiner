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

export function personaMultiplier(cluster: Cluster, baseline?: number) {
  return cluster.defaultRateMultiplier ?? safeRatio(cluster.defaultRate, cluster.baseline?.defaultRate ?? baseline);
}

export function sortPersonas(clusters: Cluster[], baseline?: number) {
  return [...clusters].sort((a, b) => (personaMultiplier(b, baseline) ?? -1) - (personaMultiplier(a, baseline) ?? -1));
}

export function lowestRiskPersonaId(clusters: Cluster[], baseline?: number) {
  return sortPersonas(clusters, baseline).filter((cluster) => {
    const multiplier = personaMultiplier(cluster, baseline);
    return multiplier !== null && multiplier < 1.15;
  }).at(-1)?.clusterId;
}

/**
 * Intent: describe combined above-baseline personas using authoritative API shares.
 * Status: complete; next: retain missing-share disclosure if API evidence is absent.
 * Blockers: none; confidence: covered by captured and missing-evidence tests.
 */
export function clusterInsight(clusters: Cluster[], baseline?: number) {
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
  const above = sortPersonas(valid, baseline).filter((cluster) => (personaMultiplier(cluster, baseline) ?? 0) > 1);
  if (!above.length) return null;
  const sumShares = (key: "shareOfClients" | "shareOfDefaults") =>
    above.every((cluster) => finiteNumber(cluster[key]))
      ? above.reduce((sum, cluster) => sum + cluster[key]!, 0)
      : null;
  return {
    clusters: above,
    names: above.map((cluster) => cluster.displayName ?? cluster.personaName).join(" and "),
    clientShare: sumShares("shareOfClients"),
    defaultShare: sumShares("shareOfDefaults"),
  };
}

export const PCA_POINTS_PER_PERSONA = 150;

export function samplePcaPersonas(points: PcaPoint[], clusters: Pick<Cluster, "clusterId">[]) {
  const buckets = new Map<number, PcaPoint[]>();
  for (const point of points) {
    const bucket = buckets.get(point.clusterId) ?? [];
    bucket.push(point);
    buckets.set(point.clusterId, bucket);
  }
  const ids = clusters.length ? clusters.map((cluster) => cluster.clusterId) : [...buckets.keys()];
  return ids.map((id) => {
    const bucket = buckets.get(id) ?? [];
    const count = Math.min(PCA_POINTS_PER_PERSONA, bucket.length);
    const sample = Array.from({ length: count }, (_, i) => bucket[Math.floor(i * bucket.length / count)]);
    return { id, sample };
  });
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
