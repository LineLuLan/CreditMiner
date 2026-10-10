"use client";

import { useClusters } from "@/hooks/useClusters";
import { useFacts } from "@/hooks/useFacts";
import { ElbowChart } from "@/components/charts/ElbowChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { Cluster, MiningReport } from "@/types/api.types";
import { ReportDetails, ReportFigure, ReportTable, Takeaway } from "./ReportPrimitives";

export function ClusteringSection({ report }: { report: MiningReport }) {
  const { data: enrichedClusters } = useClusters();
  const { getFact } = useFacts({ report });
  const clusters = report.clustering.clusters.map((cluster) => ({
    ...cluster,
    ...(enrichedClusters?.find((item) => item.clusterId === cluster.clusterId) ?? {}),
  }));
  const method = report.methodology?.clustering;
  const scores = method?.elbow ?? report.clustering.elbowScores;
  const featureNames = Array.from(
    new Set(clusters.flatMap((cluster) => Object.keys(cluster.centroid))),
  );

  return (
    <div id="section-5-2-clustering" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-lg font-semibold">K-means clustering [11]</h3>
      </div>
      <Takeaway>
        {report.clustering.bestK} segments show distinct client behavior and default rates.
      </Takeaway>
      <div className="report-chart-grid grid gap-5 xl:grid-cols-2">
        <ReportFigure
          id="elbow-wcss"
          caption={`WCSS across candidate k values; the selected k=${report.clustering.bestK} is marked.`}
        >
          <ElbowChart data={scores} bestK={report.clustering.bestK} metric="wcss" />
        </ReportFigure>
        <ReportFigure
          id="silhouette"
          caption={`Silhouette score across candidate k values; maximum separation occurs at the marked choice.`}
        >
          <ElbowChart data={scores} bestK={report.clustering.bestK} metric="silhouette" />
        </ReportFigure>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {clusters.map((cluster) => (
          <ClusterCard key={cluster.clusterId} cluster={cluster}
            defaultRate={getFact("default-rate-cluster-" + cluster.clusterId).value ?? cluster.defaultRate}
            clientShare={getFact("share-of-clients-cluster-" + cluster.clusterId).value ?? cluster.shareOfClients ?? (report.dataset.totalRows > 0 ? cluster.size / report.dataset.totalRows : null)}
            defaultShare={getFact("share-of-defaults-cluster-" + cluster.clusterId).value ?? cluster.shareOfDefaults}
          />
        ))}
      </div>
      <ReportDetails label="Show centroid table" className="report-detail-print">
        <ReportTable
          id="centroids"
          caption={`Centroid comparison for ${report.clustering.totalClusters} client segments.`}
        >
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Feature</th>
                {clusters.map((cluster) => (
                  <th key={cluster.clusterId} className="p-3 text-right">
                    C{cluster.clusterId}
                    <span
                      className="block max-w-40 truncate font-normal text-muted-foreground"
                      title={cluster.displayName ?? cluster.personaName}
                    >
                      {cluster.displayName ?? cluster.personaName}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureNames.map((feature) => (
                <tr key={feature} className="border-b last:border-0">
                  <td className="break-words p-3 font-medium">{centroidLabel(feature)}</td>
                  {clusters.map((cluster) => (
                    <td key={cluster.clusterId} className="p-3 text-right tabular-nums">
                      {formatCentroid(feature, cluster.centroid[feature])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTable>
      </ReportDetails>
      <ReportDetails>
        <p>
          K-means tests k={method?.kMin ?? scores[0]?.k ?? "?"} to k=
          {method?.kMax ?? scores.at(-1)?.k ?? "?"}. The pipeline selects k=
          {report.clustering.bestK} with {method?.strategy ?? report.clustering.strategy}.
        </p>
      </ReportDetails>
    </div>
  );
}

export function ClusterCard({ cluster, defaultRate, clientShare, defaultShare }: {
  cluster: Cluster; defaultRate: number; clientShare?: number | null; defaultShare?: number | null;
}) {
  return (
    <Card className="min-w-0 break-inside-avoid">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Segment C{cluster.clusterId}</p>
            <CardTitle className="mt-1 break-words text-base">{cluster.displayName ?? cluster.personaName}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {formatInt(cluster.size)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(cluster.traits?.length ? cluster.traits : descriptionChips(cluster.description)).map((chip) => (
            <Badge key={chip} variant="outline" className="max-w-full whitespace-normal break-words">
              {chip}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Share of clients</p>
            <p className="font-semibold tabular-nums">{clientShare == null ? "n/a" : formatPct(clientShare)}</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Share of defaults</p>
            <p className="font-semibold tabular-nums">{defaultShare == null ? "n/a" : formatPct(defaultShare)}</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Default rate</p>
            <p className="font-semibold tabular-nums">{formatPct(defaultRate)}</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Average risk-tier score</p>
            <p className="font-semibold tabular-nums">{cluster.avgRisk.toFixed(3)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function descriptionChips(description: string): string[] {
  return description
    .split(",")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part && !/^(average\s+ordinal\s+risk|avg\s*risk|avgrisk|default\s+rate)\s+/i.test(part),
    )
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

const CENTROID_LABELS: Record<string, string> = {
  UTILIZATION_1: "September utilization",
  AVG_UTILIZATION: "Average utilization",
  PAY_RATIO: "Payment ratio",
  MONTHS_DELAYED: "Months delayed",
  MAX_DELAY: "Maximum repayment delay",
  BILL_TREND: "Bill trend",
  LIMIT_BAL: "Credit limit (NT$)",
  AGE: "Age",
};

function centroidLabel(feature: string): string {
  return CENTROID_LABELS[feature] ?? feature.replaceAll("_", " ").toLowerCase();
}

function formatCentroid(feature: string, value: number | undefined): string {
  if (value == null) return "n/a";
  if (["UTILIZATION_1", "AVG_UTILIZATION", "PAY_RATIO"].includes(feature)) {
    return formatPct(value);
  }
  if (feature === "LIMIT_BAL") return `NT$ ${formatInt(value)}`;
  if (feature === "AGE") return `${value.toFixed(1)} years`;
  if (["MONTHS_DELAYED", "MAX_DELAY"].includes(feature)) return value.toFixed(2);
  return value.toFixed(3);
}
