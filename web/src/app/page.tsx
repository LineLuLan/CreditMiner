"use client";

import { useState } from "react";
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
import { FactsProvider, FactValue } from "@/components/charts/FactValue";
import { insightFactId, OVERVIEW_SIGNAL_IDS } from "@/lib/facts";
import { DonutChart } from "@/components/charts/DonutChart";
import { KPICard } from "@/components/charts/KPICard";
import { CHART_AXIS_TICK, CHART_SEMANTIC, CHART_TOOLTIP_PROPS } from "@/components/charts/chart-theme";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEdaDefaultBy } from "@/hooks/useEda";
import { useInsights, useInsightVisuals } from "@/hooks/useInsights";
import { useOverview } from "@/hooks/useOverview";
import { friendlyRuleValue } from "@/lib/rules-format";
import { CATEGORY_LABELS, EDA_FIELD_LABELS } from "@/lib/constants";
import { formatInt, formatPct } from "@/lib/format";

const DIMENSIONS = ["PAY_1", "RISK_TIER", "AGE"] as const;
type Dimension = (typeof DIMENSIONS)[number];

export default function OverviewPage() {
  const [dimension, setDimension] = useState<Dimension>("PAY_1");
  const { data, isLoading, error } = useOverview();
  const { data: insights } = useInsights();
  const { data: insightVisuals } = useInsightVisuals();
  const { data: defaultBy, isLoading: isDefaultByLoading, error: defaultByError } = useEdaDefaultBy(dimension);

  const isPreparingData = isLoading || data?.totalCustomers === 0;
  const nonDefaultCount = data ? data.totalCustomers - data.defaultCount : 0;
  const prioritySignals = OVERVIEW_SIGNAL_IDS.flatMap((id) => {
    const insight = insights?.find((item) => insightFactId(item) === id);
    if (!insight) return [];
    return [{ insight, visual: insightVisuals?.find((item) => item.title === insight.title) }];
  });
  const chartData = (defaultBy ?? []).filter((group) => group.count > 0).map((group) => ({
    ...group, group: friendlyRuleValue(group.group, dimension),
  }));

  return (
    <FactsProvider sources={{ overview: data, insights, visuals: insightVisuals }}>
    <div className="flex flex-col">
      <Header title="Overview" />
      <div className="min-w-0 flex-1 space-y-4 p-4 xl:p-5">
        {isPreparingData ? (
          <Card className="border-primary/30">
            <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <p className="text-lg font-semibold">Loading data...</p>
              <p className="max-w-md text-sm text-muted-foreground">
                The dataset is being prepared. This page refreshes automatically.
              </p>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <Card className="overflow-hidden bg-muted border-l-4 border-primary">
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                    Which clients are most likely to default next month?
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Use repayment behaviour, segments, and rules to find high-risk clients.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:w-56 lg:flex-col">
                  <Button asChild><Link href="/mining-report"><Brain className="mr-2 h-4 w-4" aria-hidden />Mining report<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button>
                  <Button variant="outline" asChild><Link href="/predict"><Sparkles className="mr-2 h-4 w-4" aria-hidden />Run prediction</Link></Button>
                </div>
              </CardContent>
            </Card>

            <section aria-label="Portfolio summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KPICard label="Total clients" value={<FactValue id="total-clients" animate />} hint="UCI dataset clients" />
              <KPICard label="Default count" value={<FactValue id="default-count" animate />} hint={<><FactValue id="default-rate" /> default rate</>} />
              <KPICard label="Avg pay ratio" value={<FactValue id="avg-pay-ratio" animate />} hint="Payments divided by bills" />
              <KPICard label="Avg utilization" value={<FactValue id="avg-utilization" animate />} hint="Bill divided by credit limit" />
              <KPICard
                label="High-risk tier"
                value={<FactValue id="risk-tier-high-count" />}
                hint={<>{formatPct(data.totalCustomers > 0 ? data.riskTierBreakdown.High / data.totalCustomers : null)} of clients<br />Low <FactValue id="risk-tier-low-count" /> / Medium <FactValue id="risk-tier-medium-count" /></>}
              />
            </section>

            {prioritySignals.length > 0 ? (
              <section aria-labelledby="top-signals-title" className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b px-4 py-3"><h2 id="top-signals-title" className="text-sm font-semibold">Priority default signals</h2></div>
                <div className="grid sm:grid-cols-3">
                  {prioritySignals.map(({ insight, visual }) => (
                    <Link key={insight.insightId} href="/insights" className="group min-w-0 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:border-b-0 sm:border-r sm:last:border-r-0">
                      <div className="flex items-center gap-2"><p className="text-3xl font-bold tracking-tight tabular-nums"><FactValue id={insightFactId(insight)} /></p>{visual?.lift ? <Badge><FactValue id={insightFactId(insight)} format="multiplier" /></Badge> : null}</div>
                      <div className="mt-2 flex items-start justify-between gap-3"><p className="text-sm leading-5 text-muted-foreground">{visual?.headline.label ?? insight.title}</p><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /></div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <Card className="min-w-0">
                <CardHeader className="pb-3"><CardTitle className="text-base">Default split</CardTitle><CardDescription>Class balance used by the classifiers.</CardDescription></CardHeader>
                <CardContent className="min-w-0"><DonutChart height={270} data={[{ name: CATEGORY_LABELS.Default.No, value: nonDefaultCount }, { name: CATEGORY_LABELS.Default.Yes, value: data.defaultCount }]} /></CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5"><CardTitle className="text-base">Default rate by dimension</CardTitle><CardDescription>Compare each group with the portfolio rate.</CardDescription></div>
                  <Select value={dimension} onValueChange={(value) => setDimension(value as Dimension)}>
                    <SelectTrigger aria-label="Choose default comparison dimension" className="w-full shrink-0 sm:w-[210px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{DIMENSIONS.map((option) => <SelectItem key={option} value={option}>{EDA_FIELD_LABELS[option] ?? option}</SelectItem>)}</SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="min-w-0">
                  {isDefaultByLoading ? <Skeleton className="h-[270px] w-full" /> : defaultByError ? (
                    <div className="flex h-[270px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-danger">{(defaultByError as { message?: string }).message ?? "Failed to load default comparison"}</div>
                  ) : chartData.length > 0 ? (
                    <>
                      <p className="mb-1 text-right text-xs text-muted-foreground">Portfolio <FactValue id="default-rate" /></p>
                      <div style={{ height: Math.max(270, chartData.length * 30) }} className="min-w-0" role="img" aria-label={`Default rate by ${EDA_FIELD_LABELS[dimension] ?? dimension}, compared with the overall rate of ${formatPct(data.defaultRate)}.`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 12, right: 24, left: 0, bottom: 4 }}>
                            <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" domain={[0, 1]} tick={CHART_AXIS_TICK} tickFormatter={(value: number) => formatPct(value, 0)} />
                            <YAxis type="category" dataKey="group" interval={0} width={104} tick={{ ...CHART_AXIS_TICK, fontSize: 11 }} />
                            <Tooltip {...CHART_TOOLTIP_PROPS} formatter={(value: number) => [formatPct(value), "Default rate"]} labelFormatter={formatGroupTooltipLabel} />
                            <ReferenceLine x={data.defaultRate} stroke={CHART_SEMANTIC.baseline} strokeDasharray="5 4" />
                            <Bar fill={CHART_SEMANTIC.danger} dataKey="defaultRate" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                              {chartData.map((group) => <Cell key={group.group} fill={group.defaultRate > data.defaultRate ? CHART_SEMANTIC.danger : CHART_SEMANTIC.neutral} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">The dashed line marks the overall default rate of {formatPct(data.defaultRate)}.</p>
                    </>
                  ) : <div className="flex h-[270px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No groups are available for this dimension.</div>}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        {error ? <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p>{(error as { message?: string }).message ?? "Failed to load overview"}</p></div> : null}
      </div>
    </div>
    </FactsProvider>
  );
}

function formatGroupTooltipLabel(_label: unknown, payload: unknown): string {
  if (!Array.isArray(payload)) return "";
  const row = (payload[0] as { payload?: { group?: string; count?: number } } | undefined)?.payload;
  if (!row?.group) return "";
  return row.count == null ? row.group : `${row.group} (n=${formatInt(row.count)})`;
}
