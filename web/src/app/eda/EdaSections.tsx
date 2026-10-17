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
import { hasCompleteClassSeries } from "./distribution-bins";
import { useEdaDistribution } from "@/hooks/useEda";
import { EDA_FIELD_LABELS, EDA_FIELD_UNITS, EDA_NUMERIC_COLS } from "@/lib/constants";
import { formatDecimal, formatNt, formatRatio } from "@/lib/format";
import type { EdaDistributionSeries, EdaDistributionStats } from "@/types/api.types";

export function DistributionPanel() {
  const [col, setCol] = React.useState<string>(EDA_NUMERIC_COLS[0]);
  const [mode, setMode] = React.useState<"quantile" | "equal-width">(EDA_FIELD_UNITS[EDA_NUMERIC_COLS[0]] === "NT$" ? "quantile" : "equal-width");
  const [splitByDefault, setSplitByDefault] = React.useState(true);
  // Intent: render server-computed bins without approximating quantiles locally.
  // Status: API owns edges and notes. Next: preserve request/cache parity.
  // Blockers: none. Confidence: captured-response and request forwarding tests.
  const { data, isLoading, error } = useEdaDistribution(col, 10, "Default", mode);
  const { data: overview } = useOverview();
  const colId = React.useId();
  const binsId = React.useId();
  const splitId = React.useId();
  const distribution = data;
  const hasObservations = distribution?.counts.some((count) => count > 0) ?? false;
  const hasUsableSplitSeries = !!data && hasCompleteClassSeries(data.counts, data.series);
  const splitSeries = hasUsableSplitSeries ? (data?.series ?? null) : null;
  const defaultMedian = col === "LIMIT_BAL" ? splitSeries?.find((item) => item.label === "Yes")?.stats?.median : undefined;
  const currentMedian = col === "LIMIT_BAL" ? splitSeries?.find((item) => item.label === "No")?.stats?.median : undefined;
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
            <Select value={col} onValueChange={(next) => { setCol(next); setMode(EDA_FIELD_UNITS[next] === "NT$" ? "quantile" : "equal-width"); }}>
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
            <Select value={mode} onValueChange={(value) => setMode(value as "quantile" | "equal-width")}>
              <SelectTrigger id={binsId}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equal-width">Equal width</SelectItem>
                <SelectItem value="quantile">Quantile (10)</SelectItem>
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
            {defaultMedian != null && currentMedian != null ? (
              <p className="rounded-md border-l-4 border-primary bg-muted/30 p-3 text-sm font-medium">
                Defaulters&apos; median credit limit is {formatNt(defaultMedian)} vs {formatNt(currentMedian)} for non-defaulters.
              </p>
            ) : null}
            <div role="img" aria-label={`Client distribution for ${EDA_FIELD_LABELS[col] ?? col}`}>
              <HistogramChart
                binEdges={distribution.binEdges}
                categories={distribution.categories}
                counts={distribution.counts}
                series={chartSeries}
                column={col}
                baseline={overview?.defaultRate}
                showSplit={splitByDefault}
                height={300}
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {EDA_FIELD_UNITS[col] === "NT$" ? "Amounts in NT$. " : EDA_FIELD_UNITS[col] === "years" ? "Age in years. " : ""}
              {hasUsableSplitSeries ? "Bars count clients; the line shows the default rate within each bin." : "Default rate per bin is unavailable without class counts."}
            </p>
            {!!distribution.notes?.length && (
              <p className="text-xs leading-5 text-muted-foreground">{distribution.notes.join(" ")}</p>
            )}
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
