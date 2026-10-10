"use client";

import * as React from "react";
import { HistogramChart } from "@/components/charts/HistogramChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/useOverview";
import { hasCompleteClassSeries, regroupDistribution, type BinningMode } from "./distribution-bins";
import { useEdaDistribution } from "@/hooks/useEda";
import { EDA_FIELD_LABELS, EDA_FIELD_UNITS, EDA_NUMERIC_COLS } from "@/lib/constants";
import { formatDecimal, formatInt, formatNt, formatRatio } from "@/lib/format";
import type { EdaDistributionSeries, EdaDistributionStats } from "@/types/api.types";

export function DistributionPanel() {
  const [col, setCol] = React.useState<string>(EDA_NUMERIC_COLS[0]);
  const [mode, setMode] = React.useState<BinningMode>(EDA_FIELD_UNITS[EDA_NUMERIC_COLS[0]] === "NT$" ? "quantile" : "equal");
  const [splitByDefault, setSplitByDefault] = React.useState(true);
  const initial = useEdaDistribution(col, 20, "Default");
  const missingEdges = initial.data?.type === "numeric" && initial.data.binEdges.length !== initial.data.counts.length + 1;
  const initialGroups = initial.data ? regroupDistribution(initial.data, mode) : undefined;
  const quantileUnavailable = mode === "quantile" && initialGroups?.type === "numeric" &&
    initialGroups.counts.length - (initialGroups.tail ? 1 : 0) < 10;
  const needsFallback = missingEdges || quantileUnavailable;
  const fallback = useEdaDistribution(needsFallback ? col : null, 10, "Default");
  const { data, isLoading, error } = needsFallback ? fallback : initial;
  const { data: overview } = useOverview();
  const colId = React.useId();
  const binsId = React.useId();
  const splitId = React.useId();
  const distribution = data ? regroupDistribution(data, needsFallback ? "equal" : mode) : undefined;
  const hasObservations = distribution?.counts.some((count) => count > 0) ?? false;
  const hasUsableSplitSeries = !!data && hasCompleteClassSeries(data.counts, data.series);
  const splitSeries = hasUsableSplitSeries ? (data?.series ?? null) : null;
  const chartSeries = hasUsableSplitSeries ? distribution?.series?.map((item) => ({
    label: displayDefaultClass(item.label),
    counts: item.counts,
  })) : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Client distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid items-end gap-3 sm:grid-cols-3 lg:max-w-4xl">
          <div className="space-y-1.5">
            <Label htmlFor={colId} className="text-xs text-muted-foreground">
              Column
            </Label>
            <Select value={col} onValueChange={(next) => { setCol(next); setMode(EDA_FIELD_UNITS[next] === "NT$" ? "quantile" : "equal"); }}>
              <SelectTrigger id={colId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDA_NUMERIC_COLS.map((column) => (
                  <SelectItem key={column} value={column}>
                    {EDA_FIELD_LABELS[column] ?? column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={binsId} className="text-xs text-muted-foreground">
              Binning
            </Label>
            <Select value={mode} onValueChange={(value) => setMode(value as BinningMode)}>
              <SelectTrigger id={binsId}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal width</SelectItem>
                <SelectItem value="quantile">Quantile (10)</SelectItem>
                <SelectItem value="log">Log</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs text-muted-foreground">Compare classes</span>
            <div className="flex h-10 items-center gap-2">
              <button
                id={splitId}
                type="button"
                role="switch"
                aria-checked={splitByDefault}
                aria-label="Split distribution by default status"
                onClick={() => setSplitByDefault((current) => !current)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                  splitByDefault ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none mt-0.5 block h-5 w-5 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none ${
                    splitByDefault ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <Label htmlFor={splitId} className="cursor-pointer text-sm">
                Split by Default
              </Label>
            </div>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : error ? (
          <p className="text-sm text-danger">
            {(error as { message?: string }).message ?? "Failed to load distribution"}
          </p>
        ) : distribution && !hasObservations ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No observations are available for this column.
          </div>
        ) : distribution ? (
          <div className="space-y-4">
            <div role="img" aria-label={`Client distribution for ${EDA_FIELD_LABELS[col] ?? col}`}>
              <HistogramChart
                binEdges={distribution.binEdges}
                categories={distribution.categories}
                counts={distribution.counts}
                series={chartSeries}
                column={col}
                baseline={overview?.defaultRate}
                tailStart={distribution.tail?.start}
                showSplit={splitByDefault}
                height={300}
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {EDA_FIELD_UNITS[col] === "NT$" ? "Amounts in NT$. " : EDA_FIELD_UNITS[col] === "years" ? "Age in years. " : ""}
              {distribution.approximate ? `Approximate ${mode === "log" ? "signed log" : "quantile"} groups from whole source bins; ${formatInt(distribution.counts.length)} bins shown. ` : ""}
              {distribution.tail ? `${formatInt(distribution.tail.count)} clients above ${formatMetric(distribution.tail.start, col)}; tail bins below 0.1% of clients are merged. ` : ""}
              {needsFallback ? "Quantile boundaries cannot be recovered from these source bins; showing the requested 10 equal-width bins with sparse tails merged. " : ""}
              {hasUsableSplitSeries ? "Bars count clients; the line shows the default rate within each bin." : "Default rate per bin is unavailable without class counts."}
            </p>
            {splitByDefault && !hasUsableSplitSeries ? (
              <p className="text-xs text-muted-foreground">
                Class split is unavailable, so the aggregate distribution is shown.
              </p>
            ) : null}
            {distribution.type !== "nominal" && data?.stats ? (
              <DistributionStatsStrip series={[{ label: "No", counts: data.counts, stats: data.stats }]} col={col} aggregate />
            ) : null}
            {distribution.type !== "nominal" && splitByDefault && splitSeries?.some((item) => item.stats) ? (
              <DistributionStatsStrip series={splitSeries} col={col} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DistributionStatsStrip({ series, col, aggregate = false }: { series: EdaDistributionSeries[]; col: string; aggregate?: boolean }) {
  const available = series.filter(
    (item): item is EdaDistributionSeries & { stats: EdaDistributionStats } =>
      item.stats != null && item.stats.count > 0,
  );

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {available.map((item) => (
        <section key={item.label} className="rounded-md border bg-muted/10 p-3">
          <h3 className="mb-2 text-sm font-medium">{aggregate ? "All clients" : displayDefaultClass(item.label)}</h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <StatValue label="Mean" value={formatMetric(item.stats.mean, col)} />
            <StatValue label="Median" value={formatMetric(item.stats.median, col)} />
            <StatValue
              label="Q1-Q3"
              value={`${formatMetric(item.stats.q1, col)} to ${formatMetric(item.stats.q3, col)}`}
            />
            <StatValue
              label="Min-max"
              value={`${formatMetric(item.stats.min, col)} to ${formatMetric(item.stats.max, col)}`}
            />
          </dl>
        </section>
      ))}
    </div>
  );
}

function StatValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="break-words text-xs font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function formatMetric(value: number, col: string): string {
  if (EDA_FIELD_UNITS[col] === "NT$") return formatNt(value);
  if (EDA_FIELD_UNITS[col] === "ratio") return formatRatio(value);
  if (EDA_FIELD_UNITS[col] === "years") return `${formatDecimal(value, 1)} years`;
  if (EDA_FIELD_UNITS[col] === "months") return `${formatDecimal(value, 2)} months`;
  return formatDecimal(value);
}

function displayDefaultClass(value: string): string {
  return value === "Yes" ? "Default" : value === "No" ? "Non-default" : value;
}
