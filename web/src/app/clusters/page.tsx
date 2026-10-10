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
} from "@/components/clusters/clusters-view";
import { useClusters } from "@/hooks/useClusters";
import { useOverview } from "@/hooks/useOverview";
import { useFacts } from "@/hooks/useFacts";
import { EDA_FIELD_LABELS, EDA_FIELD_UNITS } from "@/lib/constants";
import { CHART_SEMANTIC, clusterColor } from "@/lib/chart-theme";
import { formatNt, formatDecimal, formatInt, formatPct, formatMultiplier } from "@/lib/format";
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
  const { getFact } = useFacts({ clusters: data, overview });
  const [openId, setOpenId] = React.useState<number | null>(null);
  const selected = data?.find((cluster) => cluster.clusterId === openId);
  const insight = data ? clusterInsight(data, overview?.totalCustomers) : null;
  const totalClients =
    overview?.totalCustomers ?? data?.reduce((sum, cluster) => sum + cluster.size, 0);
  const baselineRate = data?.[0]?.baseline?.defaultRate ?? overview?.defaultRate;

  return (
    <FactsProvider sources={{ clusters: data, overview }}>
      <div className="flex min-w-0 flex-col">
        <Header title="Client Segments" />
        <div className="min-w-0 flex-1 space-y-6 p-4 xl:p-5">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
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
                    borderLeftColor: riskAboveBaseline(insight.cluster.defaultRate, baselineRate)
                      ? CHART_SEMANTIC.danger
                      : CHART_SEMANTIC.neutral,
                  }}
                >
                  <CardHeader>
                    <p className="eyebrow">Where defaults concentrate</p>
                    <CardTitle className="max-w-4xl text-2xl leading-snug">
                      {insight.cluster.displayName ?? insight.cluster.personaName}:{" "}
                      {formatPct(
                        getFact(`share-of-clients-cluster-${insight.cluster.clusterId}`).value ??
                          insight.clientShare,
                      )}{" "}
                      of clients account for{" "}
                      {formatPct(
                        getFact(`share-of-defaults-cluster-${insight.cluster.clusterId}`).value ??
                          insight.defaultShare,
                      )}{" "}
                      of defaults
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      <span
                        className={
                          riskAboveBaseline(insight.cluster.defaultRate, baselineRate)
                            ? "font-semibold text-danger"
                            : "font-semibold text-foreground"
                        }
                      >
                        <FactValue id={`cluster-c${insight.cluster.clusterId}-default-rate`} />{" "}
                        default rate
                      </span>{" "}
                      vs <FactValue id="default-rate" /> portfolio baseline {"\u00b7"}{" "}
                      {formatMultiplier(
                        insight.cluster.defaultRateMultiplier ??
                          safeRatio(insight.cluster.defaultRate, baselineRate),
                      )}
                      .
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Shares use published portfolio facts and cluster metadata when available.
                      Legacy responses fall back to segment size and reported default rate.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              <div className="grid items-stretch gap-4 md:grid-cols-2">
                {data.map((cluster) => (
                  <PersonaCard
                    key={cluster.clusterId}
                    cluster={cluster}
                    totalClients={totalClients}
                    baselineRate={baselineRate}
                    onClick={() => setOpenId(cluster.clusterId)}
                  />
                ))}
              </div>
              <ClusterComparison clusters={data} overview={overview} />
              <PcaScatterCard clusters={data} baselineRate={baselineRate} />
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
          onClose={() => setOpenId(null)}
        />
      </div>
    </FactsProvider>
  );
}

function PersonaCard({
  cluster,
  totalClients,
  baselineRate,
  onClick,
}: {
  cluster: Cluster;
  totalClients?: number;
  baselineRate?: number;
  onClick: () => void;
}) {
  const aboveBaseline = riskAboveBaseline(cluster.defaultRate, baselineRate);
  const color = aboveBaseline
    ? clusterColor(cluster.defaultRate, baselineRate)
    : CHART_SEMANTIC.neutral;
  const name = cluster.displayName ?? cluster.personaName;
  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatInt(cluster.size)} clients {"\u00b7"}{" "}
          {formatPct(cluster.shareOfClients ?? safeRatio(cluster.size, totalClients))} of portfolio
        </p>
        <Badge variant={aboveBaseline ? "danger" : "secondary"} className="w-fit">
          <FactValue id={`cluster-c${cluster.clusterId}-default-rate`} /> default {"\u00b7"}{" "}
          {formatMultiplier(
            cluster.defaultRateMultiplier ?? safeRatio(cluster.defaultRate, baselineRate),
          )}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {cluster.traits?.length ? (
          <ul className="list-disc space-y-2 border-t pl-4 pt-4 text-sm">
            {cluster.traits.slice(0, 3).map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        ) : (
          <dl className="space-y-3 border-t pt-4 text-sm">
            {DEFINING_TRAITS.map((key) => (
              <div key={key} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{EDA_FIELD_LABELS[key]}</dt>
                <dd className="font-medium tabular-nums">
                  {formatFeature(key, cluster.centroid[key])}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {cluster.evidence && (
          <p className="text-xs text-muted-foreground">
            k = {formatInt(cluster.evidence.k)} chosen by silhouette{" "}
            {formatDecimal(cluster.evidence.silhouette)}
          </p>
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
  if (unit === "months") return `${formatDecimal(value)} months`;
  if (unit === "years") return `${formatDecimal(value)} years`;
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
  };
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Persona comparison</CardTitle>
        <p className="text-sm text-muted-foreground">
          Segment averages against the portfolio. Delta chips show differences in the feature
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
                  {key === "DEFAULT_RATE" ? "Default rate" : (EDA_FIELD_LABELS[key] ?? key)}
                </th>
                {clusters.map((cluster) => {
                  const value =
                    key === "DEFAULT_RATE" ? cluster.defaultRate : cluster.centroid[key];
                  const baseline = baselines[key];
                  const delta =
                    (key === "DEFAULT_RATE" ? undefined : cluster.centroidDelta?.[key]) ??
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
                              : formatFeature(key, delta)}
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
      </CardContent>
    </Card>
  );
}
