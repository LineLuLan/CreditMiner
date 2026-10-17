"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClusterCustomersDialog } from "@/components/features/ClusterCustomersDialog";
import {
  clusterInsight,
  finiteNumber,
  riskAboveBaseline,
  safeRatio,
  sortPersonas,
  personaMultiplier,
  lowestRiskPersonaId,
} from "@/components/clusters/clusters-view";
import { useClusters } from "@/hooks/useClusters";
import { useMiningReport } from "@/hooks/useMiningReport";
import { useOverview } from "@/hooks/useOverview";
import { featureLabel, formatPersonaTrait, EDA_FIELD_UNITS } from "@/lib/constants";
import { CHART_SEMANTIC, personaColor, personaIdentityColor } from "@/lib/chart-theme";
import { formatNt, formatDecimal, formatInt, formatPct, formatMultiplier, formatDelayMonths } from "@/lib/format";
import { FactsProvider, FactValue } from "@/components/charts/FactValue";
import type { Cluster, OverviewResponse } from "@/types/api.types";

const PcaScatterCard = dynamic(
  () => import("@/components/features/PcaScatterCard").then((m) => m.PcaScatterCard),
  { ssr: false, loading: () => <Skeleton className="h-96" /> },
);
const DEFINING_TRAITS = ["LIMIT_BAL", "AVG_UTILIZATION", "MONTHS_DELAYED"];

export default function ClustersPage() {
  const { data, isLoading, error } = useClusters();
  const { data: overview } = useOverview();
  const { data: report } = useMiningReport();
  const [openId, setOpenId] = React.useState<number | null>(null);
  const selected = data?.find((cluster) => cluster.clusterId === openId);
  const totalClients =
    overview?.totalCustomers ?? data?.reduce((sum, cluster) => sum + cluster.size, 0);
  const baselineRate = data?.[0]?.baseline?.defaultRate ?? overview?.defaultRate;
  const personas = sortPersonas(data ?? [], baselineRate);
  const lowestId = lowestRiskPersonaId(personas, baselineRate);
  const insight = clusterInsight(personas, baselineRate);
  const evidence = personas.find((cluster) => cluster.evidence)?.evidence;
  const selection = report?.clustering.selection;
  const alternative = report?.clustering.elbowScores.find((row) => row.k === selection?.bestKBySilhouette);
  const mergedShare = selection?.chosenReason.match(/merges ([\d.]+% of clients)/i)?.[1];

  return (
    <FactsProvider sources={{ clusters: data, overview }}>
      <div className="flex min-w-0 flex-col">
        <Header title="Personas" />
        <div className="min-w-0 flex-1 space-y-6 p-4 xl:p-5">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : error ? (
            <Card className="border-danger/50">
              <CardContent className="pt-6">
                <p className="text-sm text-danger">
                  {(error as { message?: string }).message ?? "Failed to load clusters"}
                </p>
              </CardContent>
            </Card>
          ) : data && data.length > 0 ? (
            <>
              {insight ? (
                <Card
                  className="border-l-4"
                  style={{
                    borderLeftColor: personaColor(personaMultiplier(insight.clusters[0], baselineRate)),
                  }}
                >
                  <CardHeader>
                    <p className="eyebrow">Where defaults concentrate</p>
                    <CardTitle className="max-w-4xl text-2xl leading-snug">
                      {insight.names} ({formatPct(insight.clientShare)} of clients) hold{" "}
                      {formatPct(insight.defaultShare)} of defaults
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      These personas have default rates above the {formatPct(baselineRate)} portfolio baseline.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              {evidence || selection ? <p className="text-xs text-muted-foreground">
                k = {formatInt(selection?.chosenK ?? evidence?.k)} personas; silhouette {formatDecimal(selection?.finalSilhouette ?? evidence?.silhouette)} - weak structure, k chosen for interpretability
                {alternative && mergedShare ? ` (k = ${formatInt(alternative.k)} scores ${formatDecimal(alternative.silhouette)} but merges ${mergedShare})` : ""}.
              </p> : null}
              <div className="grid items-stretch gap-4 md:grid-cols-2">
                {personas.map((cluster) => (
                  <PersonaCard
                    key={cluster.clusterId}
                    cluster={cluster}
                    lowest={cluster.clusterId === lowestId}
                    totalClients={totalClients}
                    baselineRate={baselineRate}
                    onClick={() => setOpenId(cluster.clusterId)}
                  />
                ))}
              </div>
              <ClusterComparison clusters={personas} overview={overview} />
              <PcaScatterCard clusters={personas} baselineRate={baselineRate} />
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No cluster data yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
        <ClusterCustomersDialog
          clusterId={openId}
          personaName={selected?.displayName ?? selected?.personaName}
          defaultRate={selected?.defaultRate}
          defaultRateMultiplier={selected?.defaultRateMultiplier ?? undefined}
          baselineRate={baselineRate}
          lowest={selected?.clusterId === lowestId}
          onClose={() => setOpenId(null)}
        />
      </div>
    </FactsProvider>
  );
}

function PersonaCard({
  cluster,
  lowest,
  totalClients,
  baselineRate,
  onClick,
}: {
  cluster: Cluster;
  lowest: boolean;
  totalClients?: number;
  baselineRate?: number;
  onClick: () => void;
}) {
  const multiplier = personaMultiplier(cluster, baselineRate);
  const color = personaColor(multiplier, lowest);
  const variant = color === CHART_SEMANTIC.danger ? "danger" : color === CHART_SEMANTIC.warning ? "warning" : "secondary";
  const name = cluster.displayName ?? cluster.personaName;
  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: personaIdentityColor(name, multiplier) }} />
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{name}</CardTitle>
        {cluster.tagline ? <p className="text-sm text-muted-foreground">{cluster.tagline}</p> : null}
        <p className="text-sm text-muted-foreground">
          {formatInt(cluster.size)} clients -{" "}
          {formatPct(cluster.shareOfClients ?? safeRatio(cluster.size, totalClients))} of portfolio
        </p>
        <Badge variant={variant} className={variant === "warning" ? "w-fit bg-warning/15 text-foreground hover:bg-warning/15" : "w-fit"}>
          <FactValue id={`cluster-c${cluster.clusterId}-default-rate`} />{"\u00a0"}default -{" "}
          {formatMultiplier(
            cluster.defaultRateMultiplier ?? safeRatio(cluster.defaultRate, baselineRate),
          )}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {cluster.traits?.length ? (
          <ul className="list-disc space-y-2 border-t pl-4 pt-4 text-sm">
            {cluster.traits.slice(0, 3).map((trait) => (
              <li key={trait}>{formatPersonaTrait(trait)}</li>
            ))}
          </ul>
        ) : (
          <dl className="space-y-3 border-t pt-4 text-sm">
            {DEFINING_TRAITS.map((key) => (
              <div key={key} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{featureLabel(key)}</dt>
                <dd className="font-medium tabular-nums">
                  {formatFeature(key, cluster.centroid[key])}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <Button
          variant="outline"
          className="mt-auto w-full"
          onClick={onClick}
          aria-label={`Open clients in ${name}`}
        >
          Open clients
        </Button>
      </CardContent>
    </Card>
  );
}

function formatFeature(key: string, value: number | null | undefined) {
  if (!finiteNumber(value)) return "n/a";
  const unit = EDA_FIELD_UNITS[key];
  if (unit === "NT$") return formatNt(value);
  if (unit === "ratio" || key === "DEFAULT_RATE") return formatPct(value);
  if (unit === "months") return formatDelayMonths(value);
  if (unit === "years") return `${formatInt(value)} years`;
  return formatDecimal(value);
}

function ClusterComparison({
  clusters,
  overview,
}: {
  clusters: Cluster[];
  overview?: OverviewResponse;
}) {
  const keys = [
    "DEFAULT_RATE",
    ...Array.from(new Set(clusters.flatMap((cluster) => Object.keys(cluster.centroid)))).sort(),
  ];
  const baselines: Record<string, number | undefined> = {
    DEFAULT_RATE: clusters[0]?.baseline?.defaultRate ?? overview?.defaultRate,
    AVG_UTILIZATION: overview?.avgUtilization,
    PAY_RATIO: overview?.avgPayRatio,
    ...clusters[0]?.baseline?.centroid,
    MAX_DELAY: clusters[0]?.baseline?.longestDelayMonths ?? clusters[0]?.baseline?.centroid.MAX_DELAY,
  };
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Persona comparison</CardTitle>
        <p className="text-sm text-muted-foreground">
          Persona averages against the portfolio. Delta chips show differences in the feature
          units; rates use percentage points.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Features by persona and measured portfolio baseline</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="min-w-36 py-3 pr-4 font-medium">
                Feature
              </th>
              {clusters.map((cluster) => (
                <th scope="col" key={cluster.clusterId} className="min-w-48 py-3 pr-4 font-medium">
                  {cluster.displayName ?? cluster.personaName}
                </th>
              ))}
              <th scope="col" className="min-w-32 py-3 font-medium">
                Portfolio
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key} className="border-b last:border-b-0">
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  {key === "DEFAULT_RATE" ? "Default rate" : key === "BILL_TREND" ? "Bill trend (% of limit)" : featureLabel(key)}
                </th>
                {clusters.map((cluster) => {
                  const value =
                    key === "DEFAULT_RATE" ? cluster.defaultRate : key === "MAX_DELAY" ? (cluster.longestDelayMonths ?? cluster.centroid[key]) : cluster.centroid[key];
                  const baseline = baselines[key];
                  const delta =
                    (key === "DEFAULT_RATE" || key === "MAX_DELAY" ? undefined : cluster.centroidDelta?.[key]) ??
                    (finiteNumber(value) && finiteNumber(baseline) ? value - baseline : null);
                  const isRate = key === "DEFAULT_RATE" || EDA_FIELD_UNITS[key] === "ratio";
                  return (
                    <td key={cluster.clusterId} className="py-3 pr-4 tabular-nums">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{formatFeature(key, value)}</span>
                        {delta !== null ? (
                          <Badge
                            variant={
                              key === "DEFAULT_RATE" && riskAboveBaseline(value, baseline)
                                ? "danger"
                                : "secondary"
                            }
                            className="whitespace-nowrap font-normal"
                          >
                            {delta > 0 ? "+" : ""}
                            {isRate
                              ? `${formatDecimal(delta * 100, 1)} pp`
                              : EDA_FIELD_UNITS[key] === "months" ? `${formatDecimal(delta, 1)} months`
                              : key === "AGE" ? `${formatDecimal(delta, 1)} years` : formatFeature(key, delta)}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
                <td className="py-3 tabular-nums text-muted-foreground">
                  {formatFeature(key, baselines[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clusters.some((cluster) => cluster.longestDelayMonths == null) || clusters[0]?.baseline?.longestDelayMonths == null ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Longest delay falls back to a mean repayment status code where duration is unavailable;
            negative codes represent paid in full or no use, so this mean is not a delay duration.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
