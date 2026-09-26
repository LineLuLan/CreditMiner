"use client";

import { ElbowChart } from "@/components/charts/ElbowChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { Cluster, MiningReport } from "@/types/api.types";
import { ReportDetails, ReportFigure, ReportTable, Takeaway } from "./ReportPrimitives";

export function ClusteringSection({ report }: { report: MiningReport }) {
  const method = report.methodology?.clustering;
  const scores = method?.elbow ?? report.clustering.elbowScores;
  const featureNames = Array.from(
    new Set(report.clustering.clusters.flatMap((cluster) => Object.keys(cluster.centroid))),
  );

  return (
    <div id="section-5-2" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-xl font-semibold">5.2 Clustering</h3>
      </div>
      <Takeaway>
        {report.clustering.bestK} segments show distinct customer behavior and churn.
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
        {report.clustering.clusters.map((cluster) => (
          <ClusterCard key={cluster.clusterId} cluster={cluster} />
        ))}
      </div>
      <ReportDetails label="Show centroid table" className="report-detail-print">
        <ReportTable
          id="centroids"
          caption={`Centroid comparison for ${report.clustering.totalClusters} customer segments.`}
        >
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Feature</th>
                {report.clustering.clusters.map((cluster) => (
                  <th key={cluster.clusterId} className="p-3 text-right">
                    C{cluster.clusterId}
                    <span
                      className="block max-w-40 truncate font-normal text-muted-foreground"
                      title={cluster.personaName}
                    >
                      {cluster.personaName}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureNames.map((feature) => (
                <tr key={feature} className="border-b last:border-0">
                  <td className="break-words p-3 font-medium">{feature}</td>
                  {report.clustering.clusters.map((cluster) => (
                    <td key={cluster.clusterId} className="p-3 text-right tabular-nums">
                      {cluster.centroid[feature]?.toFixed(3) ?? "n/a"}
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

function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <Card className="min-w-0 break-inside-avoid">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Segment C{cluster.clusterId}</p>
            <CardTitle className="mt-1 break-words text-base">{cluster.personaName}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {formatInt(cluster.size)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {descriptionChips(cluster.description).map((chip) => (
            <Badge key={chip} variant="outline">
              {chip}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Churn rate</p>
            <p className="font-semibold tabular-nums">{formatPct(cluster.churnRate)}</p>
          </div>
          <div className="rounded-md bg-muted/30 p-2">
            <p className="text-[11px] text-muted-foreground">Average risk</p>
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
    .filter((part) => part && !/^(avg\s*risk|avgrisk|churn)\s*=/i.test(part))
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}
