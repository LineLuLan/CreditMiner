"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { DonutChart } from "@/components/charts/DonutChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMiningReport } from "@/hooks/useMiningReport";
import { CLUSTER_COLORS } from "@/lib/constants";
import { formatInt, formatPct, formatUsd } from "@/lib/utils";
import type { Cluster, MiningReport, Rule } from "@/types/api.types";

const FEATURE_LABELS: Record<string, string> = {
  Total_Trans_Amt: "Transaction amount",
  Customer_Age: "Customer age",
  Total_Trans_Ct: "Transaction count",
  Total_Amt_Chng_Q4_Q1: "Amount change Q4/Q1",
  Spending_Intensity: "Spending intensity",
  Total_Ct_Chng_Q4_Q1: "Count change Q4/Q1",
  Credit_Limit: "Credit limit",
  Risk_Score: "Risk score",
  Avg_Utilization_Ratio: "Utilization",
};

export default function MiningReportPage() {
  const { data, isLoading, error } = useMiningReport();

  return (
    <div className="flex flex-col">
      <Header title="Data Mining Report" />
      <div className="flex-1 space-y-6 p-6">
        {isLoading ? (
          <ReportSkeleton />
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                {(error as { message?: string }).message ?? "Failed to load mining report"}
              </p>
            </CardContent>
          </Card>
        ) : data ? (
          <ReportContent report={data} />
        ) : null}
      </div>
    </div>
  );
}

function ReportContent({ report }: { report: MiningReport }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Rows" value={formatInt(report.dataset.totalRows)} note="BankChurners" />
        <MetricCard label="Features" value={formatInt(report.dataset.totalColumns)} note="after leakage drop" />
        <MetricCard label="Churn" value={formatPct(report.dataset.churnRate)} note={`${formatInt(report.dataset.attritedCustomers)} attrited`} />
        <MetricCard label="Best model" value={report.classification.bestModel} note={report.classification.bestVariant} />
        <MetricCard label="Clusters" value={`k=${report.clustering.bestK || "?"}`} note={report.clustering.strategy} />
        <MetricCard label="Rules" value={formatInt(report.rules.totalRules)} note={`${formatInt(report.rules.retentionRules)} retention`} />
      </div>

      {report.warnings.length > 0 ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="space-y-2 pt-6 text-sm">
            {report.warnings.map((w) => (
              <div key={w} className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-warning" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="dataset" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="dataset">Dataset</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="clustering">Clustering</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="dataset">
          <DatasetTab report={report} />
        </TabsContent>
        <TabsContent value="classification">
          <ClassificationTab report={report} />
        </TabsContent>
        <TabsContent value="clustering">
          <ClusteringTab report={report} />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab report={report} />
        </TabsContent>
        <TabsContent value="anomalies">
          <AnomaliesTab report={report} />
        </TabsContent>
        <TabsContent value="insights">
          <InsightsTab report={report} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function DatasetTab({ report }: { report: MiningReport }) {
  const attrition = report.dataset.attritionBreakdown.map((row) => ({
    name: row.name.replace(" Customer", ""),
    value: row.count,
  }));
  const missing = report.dataset.topMissingColumns.map((row) => ({
    name: row.name,
    missing: row.missing,
    missingPct: row.missingPct,
  }));
  const tiers = Object.entries(report.dataset.tierBreakdown).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dataset profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <EvidenceRow label="Class column" value={report.dataset.classColumn} />
          <EvidenceRow label="Numeric features" value={formatInt(report.dataset.numericColumns)} />
          <EvidenceRow label="Categorical features" value={formatInt(report.dataset.categoricalColumns)} />
          <EvidenceRow label="Missing values" value={formatInt(report.dataset.totalMissingValues)} />
          <EvidenceRow label="DB customer rows" value={formatInt(report.dataset.dbCustomerRows)} />
          <EvidenceRow
            label="Leakage columns removed"
            value={formatInt(report.dataset.leakageColumnsDropped.length)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attrition distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={attrition} height={260} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unknown/missing fields</CardTitle>
        </CardHeader>
        <CardContent>
          {missing.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={missing} margin={{ top: 8, right: 12, left: -12, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" height={70} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="missing" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No missing values reported in the active describe table." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tiers} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function ClassificationTab({ report }: { report: MiningReport }) {
  const metric = report.classification.modelMetrics[0];
  const features = report.classification.featureImportance.slice(0, 12).map((f) => ({
    name: FEATURE_LABELS[f.name] ?? f.name,
    sharePct: Math.round(f.share * 1000) / 10,
    importance: f.importance,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Best algorithm" value={report.classification.bestModel} note={report.classification.bestVariant} />
        <MetricCard label="Test F1" value={metric?.testF1 ? formatPct(metric.testF1) : "n/a"} note="attrited class" />
        <MetricCard label="ROC-AUC" value={metric?.testRocAuc?.toFixed(4) ?? "n/a"} note="ranking quality" />
        <MetricCard label="PR-AUC" value={metric?.testPrAuc?.toFixed(4) ?? "n/a"} note="imbalanced class" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RandomForest feature importance</CardTitle>
        </CardHeader>
        <CardContent>
          {features.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={features} layout="vertical" margin={{ top: 8, right: 20, left: 130, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" unit="%" fontSize={11} />
                <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sharePct" name="Importance share" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Feature-importance artifact is not available." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classification evidence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {report.classification.modelMetrics.map((m) => (
            <div key={`${m.model}-${m.variant}`} className="rounded-md border p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium">{m.model}</p>
                <Badge variant="secondary">{m.variant}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <EvidenceRow label="F1" value={m.testF1 ? formatPct(m.testF1) : "n/a"} />
                <EvidenceRow label="ROC" value={m.testRocAuc?.toFixed(3) ?? "n/a"} />
                <EvidenceRow label="PR" value={m.testPrAuc?.toFixed(3) ?? "n/a"} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{m.source}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ClusteringTab({ report }: { report: MiningReport }) {
  const clusterBars = report.clustering.clusters.map((c) => ({
    name: c.personaName,
    churnPct: Math.round(c.churnRate * 1000) / 10,
    riskPct: Math.round(c.avgRisk * 1000) / 10,
    size: c.size,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {report.clustering.clusters.map((cluster) => (
          <ClusterEvidenceCard key={cluster.clusterId} cluster={cluster} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>k selection: WCSS and silhouette</CardTitle>
          </CardHeader>
          <CardContent>
            {report.clustering.elbowScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={report.clustering.elbowScores} margin={{ top: 8, right: 20, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="k" fontSize={11} />
                  <YAxis yAxisId="left" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="wcss" name="WCSS" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="silhouette" name="Silhouette" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Elbow/silhouette artifact is not available." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cluster churn vs risk</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clusterBars} margin={{ top: 8, right: 12, left: -12, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" height={64} fontSize={11} />
                <YAxis unit="%" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="churnPct" name="Churn" radius={[4, 4, 0, 0]}>
                  {clusterBars.map((_, i) => (
                    <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="riskPct" name="Avg risk" fill="#f59e0b" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RulesTab({ report }: { report: MiningReport }) {
  const categoryData = [
    { name: "Retention", value: report.rules.retentionRules },
    { name: "Churn", value: report.rules.churnRules },
  ].filter((x) => x.value > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Rule summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Avg support" value={formatPct(report.rules.avgSupport, 2)} />
            <MetricCard label="Avg confidence" value={formatPct(report.rules.avgConfidence)} />
            <MetricCard label="Avg lift" value={report.rules.avgLift.toFixed(2)} />
            <MetricCard label="Max lift" value={report.rules.maxLift.toFixed(2)} />
          </div>
          {categoryData.length > 0 ? <DonutChart data={categoryData} height={220} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Apriori rules by lift</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <RulesTable rules={report.rules.topRules} />
        </CardContent>
      </Card>
    </div>
  );
}

function AnomaliesTab({ report }: { report: MiningReport }) {
  const anomaly = report.anomalies;
  const signalData = [
    { name: "Phase 2 outliers", value: anomaly.phase2OutlierCount ?? anomaly.dbOutlierCount },
    { name: "Strong cluster outliers", value: anomaly.clusterStrongOutlierCount ?? 0 },
    { name: "Combined anomalies", value: anomaly.combinedAnomalyCount ?? anomaly.dbAnomalyCount },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="DB outliers" value={formatInt(anomaly.dbOutlierCount)} />
        <MetricCard label="DB anomalies" value={formatInt(anomaly.dbAnomalyCount)} />
        <MetricCard label="Combined rate" value={anomaly.combinedAnomalyPct ? formatPct(anomaly.combinedAnomalyPct) : "n/a"} />
        <MetricCard label="Strong threshold" value={anomaly.strongThreshold?.toFixed(3) ?? "n/a"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Anomaly signal funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={signalData} margin={{ top: 8, right: 12, left: -12, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top anomalous customers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Reason</th>
                  <th className="py-2 pr-4 text-right font-medium">Risk</th>
                  <th className="py-2 pr-4 text-right font-medium">Cluster</th>
                </tr>
              </thead>
              <tbody>
                {anomaly.topAnomalies.map((row) => (
                  <tr key={row.clientNum} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-mono">{row.clientNum}</td>
                    <td className="py-2 pr-4">{row.reason}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.score.toFixed(3)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.clusterId ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InsightsTab({ report }: { report: MiningReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {report.insights.map((insight) => (
        <Card key={insight.insightId}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">{insight.title}</CardTitle>
              <Badge variant="secondary">{insight.category}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <EvidenceBlock title="Discovery" body={insight.discovery} />
            <EvidenceBlock title="Evidence" body={insight.evidence} />
            <EvidenceBlock title="Recommendation" body={insight.recommendation} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="eyebrow">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
        {note ? <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function EvidenceBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border-l-4 border-primary bg-muted/40 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {title}
      </p>
      <p>{body}</p>
    </div>
  );
}

function ClusterEvidenceCard({ cluster }: { cluster: Cluster }) {
  const credit = cluster.centroid.Credit_Limit;
  const util = cluster.centroid.Avg_Utilization_Ratio;
  const trans = cluster.centroid.Total_Trans_Amt;
  return (
    <Card>
      <div
        className="h-1.5"
        style={{ backgroundColor: CLUSTER_COLORS[cluster.clusterId % CLUSTER_COLORS.length] }}
      />
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{cluster.personaName}</CardTitle>
          <Badge variant="secondary">C{cluster.clusterId}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{cluster.description}</p>
        <div className="grid grid-cols-2 gap-2">
          <EvidenceRow label="Size" value={formatInt(cluster.size)} />
          <EvidenceRow label="Churn" value={formatPct(cluster.churnRate)} />
          <EvidenceRow label="Credit" value={credit ? formatUsd(credit) : "n/a"} />
          <EvidenceRow label="Utilization" value={util ? formatPct(util) : "n/a"} />
          <EvidenceRow label="Trans amount" value={trans ? formatUsd(trans) : "n/a"} />
          <EvidenceRow label="Avg risk" value={cluster.avgRisk.toFixed(3)} />
        </div>
      </CardContent>
    </Card>
  );
}

function RulesTable({ rules }: { rules: Rule[] }) {
  if (rules.length === 0) {
    return <EmptyState text="No rules are available in the report payload." />;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Rule</th>
          <th className="py-2 pr-4 font-medium">Then</th>
          <th className="py-2 pr-4 text-right font-medium">Support</th>
          <th className="py-2 pr-4 text-right font-medium">Confidence</th>
          <th className="py-2 pr-4 text-right font-medium">Lift</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule) => (
          <tr key={rule.ruleId} className="border-b last:border-b-0">
            <td className="max-w-[320px] py-2 pr-4 font-mono" title={rule.lhs}>
              {rule.lhs}
            </td>
            <td className="max-w-[220px] py-2 pr-4 font-mono" title={rule.rhs}>
              {rule.rhs}
            </td>
            <td className="py-2 pr-4 text-right tabular-nums">{formatPct(rule.support, 2)}</td>
            <td className="py-2 pr-4 text-right tabular-nums">{formatPct(rule.confidence)}</td>
            <td className="py-2 pr-4 text-right tabular-nums font-medium">{rule.lift.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-[520px]" />
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  fontSize: 12,
};
