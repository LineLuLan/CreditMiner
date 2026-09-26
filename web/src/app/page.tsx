"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Brain, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DonutChart } from "@/components/charts/DonutChart";
import { KPICard } from "@/components/charts/KPICard";
import {
  CHART_AXIS_TICK,
  CHART_SEMANTIC,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { useEdaChurnBy } from "@/hooks/useEda";
import { useInsights, useInsightVisuals } from "@/hooks/useInsights";
import { useMiningReport } from "@/hooks/useMiningReport";
import { useOverview } from "@/hooks/useOverview";
import { formatInt, formatPct } from "@/lib/utils";

const DIMENSIONS = [
  { value: "Months_Inactive_12_mon", label: "Inactive months" },
  { value: "Contacts_Count_12_mon", label: "Contacts in last year" },
  { value: "Card_Category", label: "Card category" },
] as const;

type Dimension = (typeof DIMENSIONS)[number]["value"];

export default function OverviewPage() {
  const [dimension, setDimension] = useState<Dimension>("Months_Inactive_12_mon");
  const { data, isLoading, error } = useOverview();
  const { data: report, isLoading: isReportLoading, error: reportError } = useMiningReport();
  const { data: insights } = useInsights();
  const { data: insightVisuals } = useInsightVisuals();
  const {
    data: churnBy,
    isLoading: isChurnByLoading,
    error: churnByError,
  } = useEdaChurnBy(dimension);

  const existingCount = data ? data.totalCustomers - data.attritedCount : 0;
  const riskStatus =
    data && data.avgRiskScore >= 0.55
      ? "Elevated"
      : data && data.avgRiskScore >= 0.35
        ? "Watch"
        : "Stable";
  const anomalyCount = report
    ? (report.anomalies.combinedAnomalyCount ?? report.anomalies.dbAnomalyCount)
    : null;
  const anomalyPct =
    report && anomalyCount !== null
      ? (report.anomalies.combinedAnomalyPct ??
        (report.dataset.totalRows > 0 ? anomalyCount / report.dataset.totalRows : 0))
      : null;
  const prioritySignals = (insights ?? [])
    .flatMap((insight) => {
      const visual = insightVisuals?.find((item) => item.title === insight.title);
      return insight.priority === 1 && visual ? [{ insight, visual }] : [];
    })
    .slice(0, 3);
  const animatedCustomers = useCountUp(data?.totalCustomers ?? 0);
  const animatedAttrited = useCountUp(data?.attritedCount ?? 0);
  const animatedRisk = useCountUp(data?.avgRiskScore ?? 0);
  const animatedUtilization = useCountUp(data?.avgUtilization ?? 0);
  const animatedAnomalies = useCountUp(anomalyCount ?? 0);
  const chartData = (churnBy ?? []).filter((group) => group.count > 0);
  const chartMax = data
    ? Math.min(
        1,
        Math.max(0.25, data.churnRate, ...chartData.map((group) => group.churnRate)) * 1.15,
      )
    : 1;

  useEffect(() => {
    if (!churnByError) return;
    if (dimension === "Months_Inactive_12_mon") setDimension("Contacts_Count_12_mon");
    else if (dimension === "Contacts_Count_12_mon") setDimension("Card_Category");
  }, [churnByError, dimension]);

  return (
    <div className="flex flex-col">
      <Header title="Overview" />
      <div className="min-w-0 flex-1 space-y-4 p-4 xl:p-5">
        {isLoading ? (
          <OverviewSkeleton />
        ) : data ? (
          <>
            <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                    Which customers are most likely to churn?
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Use behavior, segments, and rules to find customers at risk.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:w-56 lg:flex-col">
                  <Button asChild>
                    <Link href="/mining-report">
                      <Brain className="mr-2 h-4 w-4" aria-hidden />
                      Mining report
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/predict">
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                      Run prediction
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <section
              aria-label="Portfolio summary"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <KPICard
                label="Total customers"
                value={formatInt(Math.round(animatedCustomers))}
                hint="Full demo dataset"
              />
              <KPICard
                label="Churned"
                value={formatInt(Math.round(animatedAttrited))}
                hint={`${formatPct(data.churnRate)} churn rate`}
                className="border-destructive/30"
              />
              <KPICard
                label="Avg risk score"
                value={animatedRisk.toFixed(2)}
                hint={`${riskStatus} portfolio signal`}
              />
              <KPICard
                label="Avg utilization"
                value={formatPct(animatedUtilization)}
                hint="Credit usage ratio"
              />
              <KPICard
                label="Anomalies flagged"
                value={
                  isReportLoading || reportError
                    ? "-"
                    : anomalyCount !== null
                      ? formatInt(Math.round(animatedAnomalies))
                      : "n/a"
                }
                hint={anomalyPct !== null ? `${formatPct(anomalyPct)} of records` : "Report signal"}
              />
            </section>

            {prioritySignals.length > 0 ? (
              <section aria-labelledby="top-signals-title" className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b px-4 py-3">
                  <h2 id="top-signals-title" className="text-sm font-semibold">
                    Top churn signals
                  </h2>
                </div>
                <div className="grid sm:grid-cols-3">
                  {prioritySignals.map(({ insight, visual }) => (
                    <Link
                      key={insight.insightId}
                      href="/insights"
                      className="group min-w-0 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:border-b-0 sm:border-r sm:last:border-r-0"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-3xl font-bold tracking-tight tabular-nums">
                          {visual.headline.value}
                        </p>
                        {visual.lift ? <Badge>{visual.lift} base</Badge> : null}
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <p className="text-sm leading-5 text-muted-foreground">
                          {visual.headline.label}
                        </p>
                        <ArrowRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <Card className="min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Churn split</CardTitle>
                  <CardDescription>
                    Class balance used by classification and report metrics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-w-0">
                  <DonutChart
                    height={270}
                    data={[
                      { name: "Existing", value: existingCount },
                      { name: "Churned", value: data.attritedCount },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <CardTitle className="text-base">Churn rate by dimension</CardTitle>
                    <CardDescription>{getChurnDimensionDescription(dimension)}</CardDescription>
                  </div>
                  <Select
                    value={dimension}
                    onValueChange={(value) => setDimension(value as Dimension)}
                  >
                    <SelectTrigger
                      aria-label="Choose churn comparison dimension"
                      className="w-full shrink-0 sm:w-[190px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="min-w-0">
                  {isChurnByLoading ? (
                    <Skeleton className="h-[270px] w-full" />
                  ) : churnByError ? (
                    <div className="flex h-[270px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-destructive">
                      {(churnByError as { message?: string }).message ??
                        "Failed to load churn comparison"}
                    </div>
                  ) : chartData.length > 0 ? (
                    <>
                      <div
                        className="h-[270px] min-w-0"
                        role="img"
                        aria-label={`Churn rate by ${DIMENSIONS.find((item) => item.value === dimension)?.label.toLowerCase()}, compared with the overall churn rate of ${formatPct(data.churnRate)}.`}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 12, right: 24, left: 0, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                              type="number"
                              domain={[0, chartMax]}
                              tick={CHART_AXIS_TICK}
                              tickFormatter={(value: number) => formatPct(value, 0)}
                            />
                            <YAxis
                              type="category"
                              dataKey="group"
                              width={104}
                              tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
                            />
                            <Tooltip
                              {...CHART_TOOLTIP_PROPS}
                              formatter={(value: number) => [formatPct(value), "Churn rate"]}
                              labelFormatter={formatChurnGroupTooltipLabel}
                            />
                            <ReferenceLine
                              x={data.churnRate}
                              stroke={CHART_SEMANTIC.warning}
                              strokeDasharray="5 4"
                            />
                            <Bar
                              dataKey="churnRate"
                              radius={[0, 4, 4, 0]}
                              isAnimationActive={false}
                            >
                              {chartData.map((group) => (
                                <Cell
                                  key={group.group}
                                  fill={
                                    group.churnRate > data.churnRate
                                      ? CHART_SEMANTIC.destructive
                                      : CHART_SEMANTIC.primary
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        The dashed line marks the overall churn rate of {formatPct(data.churnRate)}.
                        Red bars are above that base rate; primary bars are at or below it.
                      </p>
                    </>
                  ) : (
                    <div className="flex h-[270px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No churn groups are available for this dimension.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{(error as { message?: string }).message ?? "Failed to load overview"}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[390px]" />
        <Skeleton className="h-[390px]" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-44" />
    </div>
  );
}

function getChurnDimensionDescription(dimension: Dimension): string {
  if (dimension === "Months_Inactive_12_mon") {
    return "Groups are months inactive in the last 12 months; n shown in tooltip.";
  }
  if (dimension === "Contacts_Count_12_mon") {
    return "Groups are customer contacts in the last 12 months; n shown in tooltip.";
  }
  return "Groups are card categories; n shown in tooltip.";
}

function formatChurnGroupTooltipLabel(_label: unknown, payload: unknown): string {
  if (!Array.isArray(payload)) return "";
  const row = (payload[0] as { payload?: { group?: string; count?: number } } | undefined)?.payload;
  if (!row?.group) return "";
  return row.count == null ? row.group : `${row.group} (n=${formatInt(row.count)})`;
}
