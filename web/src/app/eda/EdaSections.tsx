"use client";

import * as React from "react";
import { HistogramChart } from "@/components/charts/HistogramChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEdaDistribution } from "@/hooks/useEda";
import { EDA_FIELD_LABELS, EDA_NUMERIC_COLS } from "@/lib/constants";
import type { EdaDistributionSeries, EdaDistributionStats } from "@/types/api.types";

export function DistributionPanel() {
  const [col, setCol] = React.useState<string>(EDA_NUMERIC_COLS[0]);
  const [bins, setBins] = React.useState<number>(20);
  const [splitByAttrition, setSplitByAttrition] = React.useState(true);
  const { data, isLoading, error } = useEdaDistribution(
    col,
    bins,
    splitByAttrition ? "Attrition_Flag" : undefined,
  );
  const colId = React.useId();
  const binsId = React.useId();
  const splitId = React.useId();
  const distribution = data;
  const hasObservations = distribution?.counts.some((count) => count > 0) ?? false;
  const hasUsableSplitSeries =
    splitByAttrition &&
    (distribution?.series?.some((item) => item.counts.some((count) => count > 0)) ?? false);
  const splitSeries = hasUsableSplitSeries ? (distribution?.series ?? null) : null;
  const chartSeries = splitSeries?.map((item) => ({
    label: displayChurnClass(item.label),
    counts: item.counts,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid items-end gap-3 sm:grid-cols-3 lg:max-w-4xl">
          <div className="space-y-1.5">
            <Label htmlFor={colId} className="text-xs text-muted-foreground">
              Column
            </Label>
            <Select value={col} onValueChange={setCol}>
              <SelectTrigger id={colId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDA_NUMERIC_COLS.map((column) => (
                  <SelectItem key={column} value={column}>
                    {EDA_FIELD_LABELS[column] ?? column} ({column})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={binsId} className="text-xs text-muted-foreground">
              Bins ({bins})
            </Label>
            <Input
              id={binsId}
              type="range"
              min={5}
              max={50}
              value={bins}
              onChange={(event) => setBins(Number(event.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs text-muted-foreground">Compare classes</span>
            <div className="flex h-10 items-center gap-2">
              <button
                id={splitId}
                type="button"
                role="switch"
                aria-checked={splitByAttrition}
                aria-label="Split distribution by churn status"
                onClick={() => setSplitByAttrition((current) => !current)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                  splitByAttrition ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none mt-0.5 block h-5 w-5 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none ${
                    splitByAttrition ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <Label htmlFor={splitId} className="cursor-pointer text-sm">
                Split by churn
              </Label>
            </div>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load distribution"}
          </p>
        ) : distribution && !hasObservations ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No observations are available for this column.
          </div>
        ) : distribution ? (
          <div className="space-y-4">
            <div role="img" aria-label={`Customer distribution for ${EDA_FIELD_LABELS[col] ?? col}`}>
              <HistogramChart
                binEdges={distribution.binEdges}
                categories={distribution.categories}
                counts={distribution.counts}
                series={chartSeries}
                height={300}
              />
            </div>
            {splitByAttrition && !hasUsableSplitSeries ? (
              <p className="text-xs text-muted-foreground">
                Class split is unavailable, so the aggregate distribution is shown.
              </p>
            ) : null}
            {distribution.type !== "nominal" && splitSeries?.some((item) => item.stats) ? (
              <DistributionStatsStrip series={splitSeries} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DistributionStatsStrip({ series }: { series: EdaDistributionSeries[] }) {
  const available = series.filter(
    (item): item is EdaDistributionSeries & { stats: EdaDistributionStats } =>
      item.stats != null && item.stats.count > 0,
  );

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {available.map((item) => (
        <section key={item.label} className="rounded-md border bg-muted/10 p-3">
          <h3 className="mb-2 text-sm font-medium">{displayChurnClass(item.label)}</h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <StatValue label="Mean" value={formatMetric(item.stats.mean)} />
            <StatValue label="Median" value={formatMetric(item.stats.median)} />
            <StatValue
              label="Q1-Q3"
              value={`${formatMetric(item.stats.q1)} to ${formatMetric(item.stats.q3)}`}
            />
            <StatValue
              label="Min-max"
              value={`${formatMetric(item.stats.min)} to ${formatMetric(item.stats.max)}`}
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

function formatMetric(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function displayChurnClass(value: string): string {
  if (value === "Attrited Customer") return "Churned";
  if (value === "Existing Customer") return "Active";
  return value;
}
