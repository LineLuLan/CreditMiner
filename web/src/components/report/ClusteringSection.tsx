"use client";

import { useClusters } from "@/hooks/useClusters";
import { useFacts } from "@/hooks/useFacts";
import { usePcaMeta } from "@/hooks/useEda";
import { ElbowChart } from "@/components/charts/ElbowChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDecimal, formatInt, formatPct, formatMultiplier, formatDelayMonths, formatNt } from "@/lib/format";
import { featureLabel, formatPersonaTrait } from "@/lib/constants";
import { sortPersonas, personaMultiplier, lowestRiskPersonaId } from "@/components/clusters/clusters-view";
import { personaIdentityColor } from "@/lib/chart-theme";
import type { Cluster, MiningReport } from "@/types/api.types";
import { ReportDetails, ReportFigure, ReportTable, Takeaway } from "./ReportPrimitives";

export function ClusteringSection({ report }: { report: MiningReport }) {
  const { data: enrichedClusters } = useClusters();
  const { data: pcaMeta } = usePcaMeta();
  const clusters = sortPersonas(enrichedClusters ?? report.clustering.clusters, report.dataset.defaultRate);
  const { getFact } = useFacts({ report, clusters });
  const lowestId = lowestRiskPersonaId(clusters, report.dataset.defaultRate);
  const selection = report.clustering.selection;
  const evidence = clusters.find((cluster) => cluster.evidence)?.evidence;
  const chosenK = selection?.chosenK ?? evidence?.k ?? report.clustering.bestK;
  const finalSilhouette = selection?.finalSilhouette ?? evidence?.silhouette;
  const method = report.methodology?.clustering;
  const scores = method?.elbow ?? report.clustering.elbowScores;
  const twoClusterSilhouette = scores.find((score) => score.k === 2)?.silhouette;
  const featureNames = Array.from(
    new Set(clusters.flatMap((cluster) => Object.keys(cluster.centroid))),
  );

  return (
    <div id="section-5-2" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-xl font-semibold">5.2 Personas (K-means)</h3>
      </div>
      <Takeaway>
        {clusters.length} personas show distinct client behavior and default rates using K-means [11].
      </Takeaway>
      <p className="text-sm text-muted-foreground">
        {twoClusterSilhouette != null
          ? `The k = 2 sweep silhouette is ${formatDecimal(twoClusterSilhouette, 3)}, the final k = ${formatInt(chosenK)} model scores ${formatDecimal(finalSilhouette, 3)}.`
          : `The final k = ${formatInt(chosenK)} model scores ${formatDecimal(finalSilhouette, 3)}.`}
      </p>
      {selection?.chosenReason ? <p className="text-sm">{selection.chosenReason}</p> : null}
      {pcaMeta?.explainedVarianceOfTotal?.length ? <p className="text-sm text-muted-foreground">
        PC1 and PC2 explain {formatPct(pcaMeta.explainedVarianceOfTotal.slice(0, 2).reduce((sum, value) => sum + value, 0))} of the variance of the {featureNames.length} features.
      </p> : null}
      <div className="report-chart-grid grid gap-5 xl:grid-cols-2">
        <ReportFigure
          id="elbow-wcss"
          caption={`WCSS across candidate k values; the selected k=${chosenK} is marked.`}
        >
          <ElbowChart data={scores} bestK={chosenK} metric="wcss" />
        </ReportFigure>
        <ReportFigure
          id="silhouette"
          caption={`Silhouette score across candidate k values; the selected k is marked. Sweep scores describe the candidate runs, not the final refit.`}
        >
          <ElbowChart data={scores} bestK={chosenK} metric="silhouette" />
        </ReportFigure>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {clusters.map((cluster) => (
          <ClusterCard key={cluster.clusterId} cluster={cluster}
            lowest={cluster.clusterId === lowestId} baselineRate={report.dataset.defaultRate}
            defaultRate={getFact("default-rate-cluster-" + cluster.clusterId).value ?? cluster.defaultRate}
            clientShare={getFact("share-of-clients-cluster-" + cluster.clusterId).value ?? cluster.shareOfClients ?? (report.dataset.totalRows > 0 ? cluster.size / report.dataset.totalRows : null)}
            defaultShare={getFact("share-of-defaults-cluster-" + cluster.clusterId).value ?? cluster.shareOfDefaults}
          />
        ))}
      </div>
      <ReportDetails label="Show centroid table" className="report-detail-print">
        <ReportTable
          id="centroids"
          caption={`Centroid comparison for ${clusters.length} client personas.`}
        >
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Feature</th>
                {clusters.map((cluster) => (
                  <th key={cluster.clusterId} className="p-3 text-right">
                    <span
                      className="block max-w-40 whitespace-normal font-normal text-muted-foreground"
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
                      {formatCentroid(feature, feature === "MAX_DELAY" ? cluster.longestDelayMonths ?? cluster.centroid[feature] : cluster.centroid[feature])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTable>
      </ReportDetails>
      {clusters.some((cluster) => cluster.longestDelayMonths == null) ? <p className="text-xs text-muted-foreground">Longest delay uses the legacy centroid mean where clipped delay months are unavailable; negative repayment codes are included in that mean.</p> : null}
      <ReportDetails>
        <p>
          K-means tests k={method?.kMin ?? scores[0]?.k ?? "?"} to k=
          {method?.kMax ?? scores.at(-1)?.k ?? "?"}. The pipeline selects k=
          {chosenK} with {method?.strategy ?? report.clustering.strategy}.
        </p>
      </ReportDetails>
    </div>
  );
}

export function ClusterCard({ cluster, defaultRate, clientShare, defaultShare, baselineRate }: {
  lowest?: boolean; baselineRate?: number;
  cluster: Cluster; defaultRate: number; clientShare?: number | null; defaultShare?: number | null;
}) {
  const multiplier = personaMultiplier(cluster, baselineRate);
  const color = personaIdentityColor(cluster.displayName ?? cluster.personaName, multiplier);
  return (
    <Card className="min-w-0 break-inside-avoid border-t-4" style={{ borderTopColor: color }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="mt-1 break-words text-base">{cluster.displayName ?? cluster.personaName}</CardTitle>
            {cluster.tagline ? <p className="mt-1 text-sm text-muted-foreground">{cluster.tagline}</p> : null}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {formatInt(cluster.size)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(cluster.traits?.length ? cluster.traits.slice(0, 3) : descriptionChips(cluster.description)).map((chip) => (
            <Badge key={chip} variant="outline" className="max-w-full whitespace-normal break-words">
              {formatPersonaTrait(chip)}
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
            <p className="font-semibold tabular-nums">{formatPct(defaultRate)} ({formatMultiplier(multiplier)})</p>
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

export function centroidLabel(feature: string): string {
  return featureLabel(feature);
}

export function formatCentroid(feature: string, value: number | undefined): string {
  if (value == null) return "n/a";
  if (["UTILIZATION_1", "AVG_UTILIZATION", "PAY_RATIO", "BILL_TREND"].includes(feature)) {
    return formatPct(value);
  }
  if (feature === "LIMIT_BAL") return formatNt(value);
  if (feature === "AGE") return `${formatInt(value)} years`;
  if (["MONTHS_DELAYED", "MAX_DELAY"].includes(feature)) return formatDelayMonths(value);
  return value.toFixed(3);
}
