"use client";

import type { ComponentType } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  FileText,
  Lightbulb,
  Network,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
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
import { Header } from "@/components/layout/Header";
import { DonutChart } from "@/components/charts/DonutChart";
import {
  CHART_AXIS_TICK,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMiningReport } from "@/hooks/useMiningReport";
import { CLUSTER_COLORS } from "@/lib/constants";
import { formatInt, formatPct, formatUsd } from "@/lib/utils";
import type { Cluster, Insight, MiningReport, Rule } from "@/types/api.types";

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
  Customer_Value_Score: "Customer value",
  Engagement_Score: "Engagement score",
};

export default function MiningReportPage() {
  const { data, isLoading, error } = useMiningReport();

  return (
    <div className="flex flex-col">
      <Header title="Data Mining Report" />
      <div className="min-w-0 flex-1 space-y-4 p-4 xl:p-5">
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
  const metric = report.classification.modelMetrics[0];
  const topFeature = report.classification.featureImportance[0];
  const highestChurnCluster = report.clustering.clusters
    .slice()
    .sort((a, b) => b.churnRate - a.churnRate)[0];
  const strongestRule = report.rules.topRules[0];
  const anomalyCount = report.anomalies.combinedAnomalyCount ?? report.anomalies.dbAnomalyCount;
  const anomalyPct =
    report.anomalies.combinedAnomalyPct ??
    (report.dataset.totalRows > 0 ? anomalyCount / report.dataset.totalRows : 0);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-primary/35 bg-primary/5">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                CRISP-DM evidence report
              </Badge>
              <span className="text-xs text-muted-foreground">
                Generated {formatDate(report.generatedAt)}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Mining question</p>
                <h2 className="mt-2 max-w-4xl text-2xl font-bold tracking-tight md:text-3xl">
                  Which customers are likely to churn, why, and which retention actions should be
                  prioritized?
                </h2>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
                  This report combines classification, customer segmentation, association rules,
                  anomaly detection, and business insights into one evidence dashboard for the
                  BankChurners dataset.
                </p>
              </div>

              <div className="rounded-lg border bg-background/60 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Executive answer
                </p>
                <p className="mt-2 text-sm leading-6">
                  Churn is concentrated in a minority class of{" "}
                  <strong>{formatPct(report.dataset.churnRate)}</strong>. The best model is{" "}
                  <strong>{report.classification.bestModel}</strong>, customer segments resolve to{" "}
                  <strong>k={report.clustering.bestK}</strong>, and Apriori produced{" "}
                  <strong>{formatInt(report.rules.totalRules)}</strong> retention rules.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SignalTile
                icon={ShieldAlert}
                label="Churn base"
                value={formatPct(report.dataset.churnRate)}
                detail={`${formatInt(report.dataset.attritedCustomers)} attrited customers`}
              />
              <SignalTile
                icon={Brain}
                label="Best model"
                value={report.classification.bestModel}
                detail={
                  metric?.testF1 != null
                    ? `${formatPct(metric.testF1)} F1`
                    : report.classification.bestVariant
                }
              />
              <SignalTile
                icon={Network}
                label="Highest-risk segment"
                value={highestChurnCluster?.personaName ?? "n/a"}
                detail={
                  highestChurnCluster
                    ? `${formatPct(highestChurnCluster.churnRate)} churn`
                    : "No segment data"
                }
              />
              <SignalTile
                icon={Sparkles}
                label="Action evidence"
                value={`${formatInt(report.insights.length)} insights`}
                detail={`${formatInt(report.rules.retentionRules)} retention rules`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report health</CardTitle>
            <CardDescription>Data coverage and artifact status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <HealthRow label="Rows analyzed" value={formatInt(report.dataset.totalRows)} />
            <HealthRow label="Features used" value={formatInt(report.dataset.totalColumns)} />
            <HealthRow
              label="Missing values"
              value={formatInt(report.dataset.totalMissingValues)}
            />
            <HealthRow label="Anomaly rate" value={formatPct(anomalyPct)} />
            {report.warnings.length > 0 ? (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-warning" />
                  <div>
                    <p className="font-medium">Artifact note</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {report.warnings[0]}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>All report artifacts loaded.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FindingCard
          icon={Target}
          title="Prediction target"
          value={report.dataset.classColumn}
          body={`${formatPct(report.dataset.churnRate)} attrition rate gives the model an imbalanced churn-detection task.`}
        />
        <FindingCard
          icon={TrendingUp}
          title="Top driver"
          value={topFeature ? (FEATURE_LABELS[topFeature.name] ?? topFeature.name) : "n/a"}
          body={
            topFeature
              ? `${formatPct(topFeature.share)} of feature-importance share in the RandomForest artifact.`
              : "Feature importance artifact is not available."
          }
        />
        <FindingCard
          icon={Network}
          title="Customer segments"
          value={`k=${report.clustering.bestK}`}
          body={`${formatInt(report.clustering.totalClusters)} personas expose risk, value, and utilization differences.`}
        />
        <FindingCard
          icon={Lightbulb}
          title="Recommended actions"
          value={formatInt(report.insights.length)}
          body="Insights translate model, segment, rule, and anomaly evidence into retention actions."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ModelEvidence report={report} />
        <DatasetEvidence report={report} />
      </section>

      <SegmentationEvidence report={report} />

      <section className="grid gap-4 xl:grid-cols-2">
        <RulesEvidence report={report} strongestRule={strongestRule} />
        <AnomalyEvidence report={report} anomalyCount={anomalyCount} anomalyPct={anomalyPct} />
      </section>

      <InsightEvidence insights={report.insights} />
    </>
  );
}

function ModelEvidence({ report }: { report: MiningReport }) {
  const features = report.classification.featureImportance.slice(0, 10).map((feature) => ({
    name: FEATURE_LABELS[feature.name] ?? feature.name,
    sharePct: Math.round(feature.share * 1000) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Classification evidence</CardTitle>
            <CardDescription>Model quality and feature signals for churn risk.</CardDescription>
          </div>
          <Badge variant="secondary">{report.classification.bestVariant}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Best model" value={report.classification.bestModel} />
          <Metric
            label="F1"
            value={
              report.classification.modelMetrics[0]?.testF1 != null
                ? formatPct(report.classification.modelMetrics[0].testF1)
                : "n/a"
            }
          />
          <Metric
            label="ROC-AUC"
            value={report.classification.modelMetrics[0]?.testRocAuc?.toFixed(4) ?? "n/a"}
          />
          <Metric
            label="PR-AUC"
            value={report.classification.modelMetrics[0]?.testPrAuc?.toFixed(4) ?? "n/a"}
          />
        </div>

        {features.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={features}
              layout="vertical"
              margin={{ top: 4, right: 18, left: 126, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" unit="%" tick={CHART_AXIS_TICK} />
              <YAxis type="category" dataKey="name" width={126} tick={CHART_AXIS_TICK} />
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Bar
                dataKey="sharePct"
                name="Importance share"
                fill="hsl(var(--primary))"
                maxBarSize={22}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="Feature-importance artifact is not available." />
        )}

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium">Variant</th>
                <th className="px-3 py-2 text-right font-medium">F1</th>
                <th className="px-3 py-2 text-right font-medium">ROC</th>
                <th className="px-3 py-2 text-right font-medium">PR</th>
              </tr>
            </thead>
            <tbody>
              {report.classification.modelMetrics.map((metric) => (
                <tr key={`${metric.model}-${metric.variant}`} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{metric.model}</td>
                  <td className="px-3 py-2 text-muted-foreground">{metric.variant}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {metric.testF1 != null ? formatPct(metric.testF1) : "n/a"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {metric.testRocAuc?.toFixed(3) ?? "n/a"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {metric.testPrAuc?.toFixed(3) ?? "n/a"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetEvidence({ report }: { report: MiningReport }) {
  const attrition = report.dataset.attritionBreakdown.map((row) => ({
    name: row.name.replace(" Customer", ""),
    value: row.count,
  }));
  const tiers = Object.entries(report.dataset.tierBreakdown).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dataset and class balance</CardTitle>
        <CardDescription>Data readiness for classification and segmentation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Rows" value={formatInt(report.dataset.totalRows)} />
          <Metric label="Numeric" value={formatInt(report.dataset.numericColumns)} />
          <Metric label="Categorical" value={formatInt(report.dataset.categoricalColumns)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">Attrition distribution</p>
            <DonutChart data={attrition} height={220} />
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-medium">Customer tiers</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tiers} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                <YAxis tick={CHART_AXIS_TICK} />
                <Tooltip {...CHART_TOOLTIP_PROPS} />
                <Bar
                  dataKey="count"
                  fill="#10b981"
                  maxBarSize={44}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <QualityPill
            label="Missing values"
            value={formatInt(report.dataset.totalMissingValues)}
          />
          <QualityPill label="DB rows" value={formatInt(report.dataset.dbCustomerRows)} />
          <QualityPill
            label="Leakage removed"
            value={formatInt(report.dataset.leakageColumnsDropped.length)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SegmentationEvidence({ report }: { report: MiningReport }) {
  const clusterBars = report.clustering.clusters.map((cluster) => ({
    name: cluster.personaName,
    churnPct: Math.round(cluster.churnRate * 1000) / 10,
    riskPct: Math.round(cluster.avgRisk * 1000) / 10,
    size: cluster.size,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Segmentation dashboard</CardTitle>
            <CardDescription>
              k={report.clustering.bestK} customer personas selected by {report.clustering.strategy}
              .
            </CardDescription>
          </div>
          <Badge variant="secondary">{formatInt(report.clustering.totalClusters)} clusters</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
          {report.clustering.clusters.map((cluster) => (
            <ClusterCard key={cluster.clusterId} cluster={cluster} />
          ))}
        </div>
        <div className="grid gap-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={clusterBars} margin={{ top: 8, right: 12, left: -8, bottom: 34 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                angle={-15}
                textAnchor="end"
                height={56}
                tick={CHART_AXIS_TICK}
              />
              <YAxis unit="%" tick={CHART_AXIS_TICK} />
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} />
              <Bar dataKey="churnPct" name="Churn" maxBarSize={48} radius={[4, 4, 0, 0]}>
                {clusterBars.map((_, i) => (
                  <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                ))}
              </Bar>
              <Bar
                dataKey="riskPct"
                name="Avg risk"
                fill="#f59e0b"
                fillOpacity={0.75}
                maxBarSize={48}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
          {report.clustering.elbowScores.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={report.clustering.elbowScores}
                margin={{ top: 8, right: 20, left: -8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="k" tick={CHART_AXIS_TICK} />
                <YAxis yAxisId="left" tick={CHART_AXIS_TICK} />
                <YAxis yAxisId="right" orientation="right" tick={CHART_AXIS_TICK} />
                <Tooltip {...CHART_TOOLTIP_PROPS} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="wcss"
                  name="WCSS"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="silhouette"
                  name="Silhouette"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RulesEvidence({ report, strongestRule }: { report: MiningReport; strongestRule?: Rule }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Association-rule evidence</CardTitle>
        <CardDescription>
          Retention patterns ranked by support, confidence, and lift.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Rules" value={formatInt(report.rules.totalRules)} />
          <Metric label="Retention" value={formatInt(report.rules.retentionRules)} />
          <Metric label="Avg conf." value={formatPct(report.rules.avgConfidence)} />
          <Metric label="Max lift" value={report.rules.maxLift.toFixed(2)} />
        </div>
        {strongestRule ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase text-primary">Strongest rule</p>
            <p className="mt-2 font-mono text-xs leading-5">{strongestRule.lhs}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              then <span className="font-mono text-foreground">{strongestRule.rhs}</span> with{" "}
              {formatPct(strongestRule.confidence)} confidence and {strongestRule.lift.toFixed(2)}{" "}
              lift.
            </p>
          </div>
        ) : null}
        <RulesTable rules={report.rules.topRules.slice(0, 8)} />
      </CardContent>
    </Card>
  );
}

function AnomalyEvidence({
  report,
  anomalyCount,
  anomalyPct,
}: {
  report: MiningReport;
  anomalyCount: number;
  anomalyPct: number;
}) {
  const anomaly = report.anomalies;
  const signalData = [
    { name: "Phase 2", value: anomaly.phase2OutlierCount ?? anomaly.dbOutlierCount },
    { name: "Strong cluster", value: anomaly.clusterStrongOutlierCount ?? 0 },
    { name: "Combined", value: anomalyCount },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Anomaly review</CardTitle>
        <CardDescription>Outliers that may need manual portfolio review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Combined" value={formatInt(anomalyCount)} />
          <Metric label="Rate" value={formatPct(anomalyPct)} />
          <Metric label="Threshold" value={anomaly.strongThreshold?.toFixed(3) ?? "n/a"} />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={signalData} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
            <YAxis tick={CHART_AXIS_TICK} />
            <Tooltip {...CHART_TOOLTIP_PROPS} />
            <Bar
              dataKey="value"
              fill="#ef4444"
              maxBarSize={60}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
                <th className="px-3 py-2 text-right font-medium">Cluster</th>
              </tr>
            </thead>
            <tbody>
              {anomaly.topAnomalies.slice(0, 6).map((row) => (
                <tr key={row.clientNum} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-mono">{row.clientNum}</td>
                  <td className="px-3 py-2">{row.reason}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.score.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.clusterId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightEvidence({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actionable insights</CardTitle>
        <CardDescription>Business recommendations backed by the mining evidence.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((insight) => (
            <InsightCard key={insight.insightId} insight={insight} />
          ))}
      </CardContent>
    </Card>
  );
}

function SignalTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 line-clamp-1 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function FindingCard({
  icon: Icon,
  title,
  value,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function QualityPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const credit = cluster.centroid.Credit_Limit;
  const util = cluster.centroid.Avg_Utilization_Ratio;
  const transactions = cluster.centroid.Total_Trans_Amt;

  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{cluster.personaName}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{cluster.description}</p>
        </div>
        <Badge variant="secondary">C{cluster.clusterId}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="Size" value={formatInt(cluster.size)} />
        <MiniMetric label="Churn" value={formatPct(cluster.churnRate)} />
        <MiniMetric label="Risk" value={cluster.avgRisk.toFixed(2)} />
        <MiniMetric label="Credit" value={credit ? formatUsd(credit) : "n/a"} />
        <MiniMetric label="Util." value={util ? formatPct(util) : "n/a"} />
        <MiniMetric label="Trans." value={transactions ? formatUsd(transactions) : "n/a"} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold tabular-nums" title={value}>
        {value}
      </p>
    </div>
  );
}

function RulesTable({ rules }: { rules: Rule[] }) {
  if (rules.length === 0) {
    return <EmptyState text="No rules are available in the report payload." />;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/20 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">If</th>
            <th className="px-3 py-2 font-medium">Then</th>
            <th className="px-3 py-2 text-right font-medium">Support</th>
            <th className="px-3 py-2 text-right font-medium">Confidence</th>
            <th className="px-3 py-2 text-right font-medium">Lift</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.ruleId} className="border-b last:border-b-0">
              <td className="max-w-[260px] truncate px-3 py-2 font-mono" title={rule.lhs}>
                {rule.lhs}
              </td>
              <td className="max-w-[180px] truncate px-3 py-2 font-mono" title={rule.rhs}>
                {rule.rhs}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPct(rule.support, 2)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPct(rule.confidence)}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">
                {rule.lift.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-lg border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-5">{insight.title}</p>
        <Badge variant="secondary">{insight.category}</Badge>
      </div>
      <EvidenceBlock title="Discovery" body={insight.discovery} />
      <EvidenceBlock title="Evidence" body={insight.evidence} />
      <EvidenceBlock title="Action" body={insight.recommendation} />
    </div>
  );
}

function EvidenceBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3 border-l-2 border-primary/60 pl-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5">{body}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-[520px]" />
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
