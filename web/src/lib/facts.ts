import type {
  Cluster,
  FactsResponse,
  Insight,
  InsightVisual,
  MiningReport,
  OverviewResponse,
} from "@/types/api.types";

export type FactUnit = "count" | "ratio" | "points" | "score";
export interface Fact {
  id: string;
  label: string;
  value: number | null;
  unit: FactUnit;
  baseline: number | null;
  n: number | null;
  multiplier: number | null;
  source: string | null;
  ci95?: { low: number; high: number } | null;
  definition?: string;
  name?: string;
  aucDrop?: number;
}

export interface FactSources {
  catalogue?: FactsResponse;
  overview?: OverviewResponse;
  insights?: Insight[];
  visuals?: InsightVisual[];
  clusters?: Cluster[];
  report?: MiningReport;
}

const INSIGHT_FACTS: Record<string, string> = {
  "Worst delay of three or more months": "default-rate-worst-delay-ge3",
  "Low credit limits carry the most default": "default-rate-limit-q1",
  "Small payments signal default": "default-rate-payment-amount-q1",
  "Paying a larger share of the bill lowers risk": "default-rate-payment-ratio-q1",
  "Age matters only at the edges": "default-rate-age-60-plus",
  "Demographic default rates differ": "default-rate-education-highschool",
  "The risk tier rule separates clients well": "default-rate-risk-tier-high",
  "Two months late now predicts default": "late2-sep-default-rate",
  "Two or more months late now predicts default": "late2-sep-default-rate",
  "Each late month adds risk": "late3plus-6m-default-rate",
  "One cluster holds almost half of all defaults": "cluster-c0-default-rate",
  "Delaying personas hold most defaults": "share-of-defaults-delayers",
};

export function evidenceFactIds(evidence: string): string[] {
  return [...new Set(evidence.match(/facts:\s*([a-z0-9,-\s]+)/i)?.[1]
    .split(",").map((id) => id.trim()).filter(Boolean) ?? [])];
}

export function insightFactId(insight: Pick<Insight, "title" | "insightId"> & Partial<Pick<Insight, "evidence">>): string {
  return INSIGHT_FACTS[insight.title] ?? evidenceFactIds(insight.evidence ?? "")[0] ?? `insight-${insight.insightId}`;
}

export const OVERVIEW_SIGNAL_IDS = [
  "late2-sep-default-rate", "late3plus-6m-default-rate", "share-of-defaults-delayers",
] as const;

export const OVERVIEW_SIGNAL_LABELS: Record<(typeof OVERVIEW_SIGNAL_IDS)[number], string> = {
  "late2-sep-default-rate": "default rate when 2+ months late on the latest statement",
  "late3plus-6m-default-rate": "default rate when late in 3+ of the last 6 months",
  "share-of-defaults-delayers": "share of defaults held by the delaying personas",
};

const CATALOGUE_IDS: Record<string, string> = {
  "default-rate": "default-rate-overall",
  "late2-sep-default-rate": "default-rate-pay1-late2plus",
  "late3plus-6m-default-rate": "default-rate-months-delayed-ge3",
  "cluster-c0-default-rate": "default-rate-cluster-0",
  "cluster-c0-share-of-defaults": "share-of-defaults-cluster-0",
  "best-model-f1": "selected-model-holdout-f1",
  "best-model-cv-f1": "selected-model-cv-f1",
};

const finite = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function emptyFact(id: string, label = id, unit: FactUnit = "ratio"): Fact {
  return { id, label, unit, value: null, baseline: null, n: null, multiplier: null, source: null };
}

/**
 * Intent: catalogue values are authoritative; legacy responses keep older backends usable.
 * Status: exact ratios, intervals and provenance survive the adapter without rounding.
 * Next: retire prose fallback after all supported backends publish facts.
 * Blocker: none. Confidence: sample parity tests cover shared dashboard signals.
 */
export function getFact(id: string, sources: FactSources = {}): Fact {
  if (id === "education-default-spread" && sources.catalogue) {
    const rates = sources.catalogue.facts.filter((entry) => entry.factId.startsWith("default-rate-education-"));
    if (rates.length > 1) return {
      ...emptyFact(id, "Education default-rate spread including Other", "points"),
      value: (Math.max(...rates.map((entry) => entry.value)) - Math.min(...rates.map((entry) => entry.value))) * 100,
      definition: "Highest education-group default rate minus lowest; percentage-point difference.",
      source: rates.map((entry) => entry.factId).join(", "),
    };
  }
  const apiId = CATALOGUE_IDS[id] ?? id.replace(/^cluster-c(\d+)-default-rate$/, "default-rate-cluster-$1");
  const entry = sources.catalogue?.facts.find((fact) => fact.factId === apiId)
    ?? (apiId === "default-rate-pay1-late2plus"
      ? sources.catalogue?.facts.find((fact) => fact.factId === "default-rate-pay1-late2")
      : undefined);
  if (entry) return {
    id, label: entry.label, value: finite(entry.value),
    unit: entry.unit === "count" ? "count" : entry.unit === "score" ? "score" : "ratio",
    n: finite(entry.n), baseline: finite(entry.baseline), multiplier: finite(entry.multiplier),
    source: entry.source, ci95: entry.ci95, definition: entry.definition,
    name: entry.name, aucDrop: entry.aucDrop,
  };
  if (sources.catalogue && (id === "total-clients" || id === "default-count")) return {
    ...emptyFact(id, id === "total-clients" ? "Total clients" : "Default count", "count"),
    value: id === "total-clients" ? sources.catalogue.baseline.totalClients : sources.catalogue.baseline.defaultCount,
    n: sources.catalogue.baseline.totalClients, source: "/api/facts.baseline",
  };
  const legacyId = Object.keys(CATALOGUE_IDS).find((key) => CATALOGUE_IDS[key] === id);
  if (legacyId) return { ...getFact(legacyId, sources), id };
  const overview = sources.overview;
  const portfolio: Record<string, [string, FactUnit, number | undefined]> = {
    "default-rate": ["Default rate", "ratio", overview?.defaultRate],
    "default-count": ["Default count", "count", overview?.defaultCount],
    "total-clients": ["Total clients", "count", overview?.totalCustomers],
    "avg-pay-ratio": ["Avg pay ratio", "ratio", overview?.avgPayRatio],
    "avg-utilization": ["Avg utilization", "ratio", overview?.avgUtilization],
    "risk-tier-low-count": ["Low risk clients", "count", overview?.riskTierBreakdown.Low],
    "risk-tier-medium-count": ["Medium risk clients", "count", overview?.riskTierBreakdown.Medium],
    "risk-tier-high-count": ["High risk clients", "count", overview?.riskTierBreakdown.High],
  };
  if (Object.hasOwn(portfolio, id)) {
    const [label, unit, value] = portfolio[id];
    return {
      ...emptyFact(id, label, unit),
      value: finite(value),
      n: finite(overview?.totalCustomers),
      source: overview ? "/api/overview" : null,
    };
  }

  if (id === "best-model-f1") {
    const classification = sources.report?.classification;
    const best = classification?.modelMetrics.find(
      (row) => row.model === classification.bestModel && row.variant === classification.bestVariant,
    );
    return {
      ...emptyFact(id, "Best model F1"),
      value: finite(best?.testF1),
      source: best ? `/api/mining-report: ${best.source}` : null,
    };
  }

  const insights = sources.insights ?? sources.report?.insights;
  if (id === "cluster-c0-share-of-defaults") {
    const insight = insights?.find((item) => insightFactId(item) === "cluster-c0-default-rate");
    const match = insight?.discovery.match(/\b(\d+(?:\.\d+)?)% of all defaults\b/i);
    const value = match ? Number(match[1]) / 100 : null;
    return {
      ...emptyFact(id, "C0 share of defaults"),
      value: value !== null && value >= 0 && value <= 1 ? value : null,
      n: finite(overview?.defaultCount),
      source: match ? `/api/insights#${insight?.insightId}.discovery` : null,
    };
  }

  const insight = insights?.find((item) => insightFactId(item) === id);
  const title =
    insight?.title ?? Object.keys(INSIGHT_FACTS).find((key) => INSIGHT_FACTS[key] === id);
  const visual = sources.visuals?.find((item) => item.title === title);
  if (visual) return visualFact(id, visual);

  // Cluster cards also work when insight visuals are unavailable; no fallback literals.
  const clusterMatch = id.match(/^cluster-c(\d+)-default-rate$/);
  if (clusterMatch) {
    const clusters = sources.clusters ?? sources.report?.clustering.clusters;
    const cluster = clusters?.find((item) => item.clusterId === Number(clusterMatch[1]));
    const baseline = finite(overview?.defaultRate);
    const value = finite(cluster?.defaultRate);
    return {
      ...emptyFact(id, cluster ? `${cluster.personaName} default rate` : "Cluster default rate"),
      value,
      baseline,
      n: finite(cluster?.size),
      multiplier: value !== null && baseline !== null && baseline > 0 ? value / baseline : null,
      source: cluster
        ? sources.clusters
          ? "/api/clusters"
          : "/api/mining-report.clustering"
        : null,
    };
  }
  return emptyFact(id);
}

function visualFact(id: string, visual: InsightVisual): Fact {
  const headline = visual.headline.value.trim().match(/^(\d+(?:\.\d+)?)\s*(%|pts)$/);
  const unit = headline?.[2] === "pts" ? "points" : "ratio";
  const value = headline ? Number(headline[1]) / (unit === "ratio" ? 100 : 1) : null;
  const lift = visual.lift?.trim().match(/^(\d+(?:\.\d+)?)x$/);
  let cohort = visual.bars.filter((bar) => bar.highlight);
  if (id === "late2-sep-default-rate")
    cohort = visual.bars.filter((bar) => bar.label === "2 months late" ||
      (visual.headline.factId === "default-rate-pay1-late2plus" && bar.label === "3+ months late"));
  if (id === "late3plus-6m-default-rate")
    cohort = visual.bars.filter((bar) => bar.label === "3+ late months");
  // These three cohorts are represented exactly by the matching bars; other headlines
  // (e.g. utilization >=80%) cannot infer n from a differently bucketed chart.
  const hasExactCohort = [
    "late2-sep-default-rate",
    "late3plus-6m-default-rate",
    "cluster-c0-default-rate",
  ].includes(id);
  return {
    ...emptyFact(id, visual.headline.label, unit),
    value,
    baseline: unit === "ratio" && visual.baseline ? finite(visual.baseline.value / 100) : null,
    multiplier: lift ? Number(lift[1]) : null,
    n: hasExactCohort && cohort.length ? finite(cohort.reduce((sum, bar) => sum + bar.n, 0)) : null,
    source: `/api/insights/visuals: ${visual.title}`,
  };
}

export function createFacts(sources: FactSources) {
  return { getFact: (id: string) => getFact(id, sources) };
}
