"use client";

import * as React from "react";
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
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import {
  CHART_AXIS_TICK,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import { Header } from "@/components/layout/Header";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEdaCorrelation, useEdaDefaultBy } from "@/hooks/useEda";
import { CATEGORY_LABELS, DEFAULT_BY_DIMS, EDA_FIELD_LABELS } from "@/lib/constants";
import { CHART_SEMANTIC } from "@/lib/chart-theme";
import { formatDecimal, formatInt, formatMultiplier, formatPct } from "@/lib/format";
import { friendlyRuleValue } from "@/lib/rules-format";
import { DistributionPanel } from "./EdaSections";

/**
 * Intent: make class differences and portfolio-relative default visible in EDA.
 * Status: the split response remains optional and falls back to aggregate counts.
 * Next: preserve the fallback if the backend adds more distribution columns.
 * Blockers: none. Confidence: typecheck and server-free layout checks cover this view.
 */
export default function EdaPage() {
  return (
    <div className="flex flex-col">
      <Header title="Exploratory Data Analysis" />
      <div className="min-w-0 flex-1 space-y-4 p-4 xl:p-5">
        <Tabs defaultValue="distribution">
          <TabsList className="grid h-auto w-full grid-cols-3 sm:h-10 sm:w-auto">
            <TabsTrigger value="distribution" className="px-2 text-xs sm:px-3 sm:text-sm">
              Distribution
            </TabsTrigger>
            <TabsTrigger value="correlation" className="px-2 text-xs sm:px-3 sm:text-sm">
              Correlation
            </TabsTrigger>
            <TabsTrigger value="default-by" className="px-2 text-xs sm:px-3 sm:text-sm">
              Default by
            </TabsTrigger>
          </TabsList>
          <TabsContent value="distribution">
            <DistributionPanel />
          </TabsContent>
          <TabsContent value="correlation">
            <CorrelationPanel />
          </TabsContent>
          <TabsContent value="default-by">
            <DefaultByPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CorrelationPanel() {
  const { data, isLoading, error } = useEdaCorrelation();
  const strongestPairs = React.useMemo(
    () => (data ? getStrongestCorrelationPairs(data.columns, data.matrix) : []),
    [data],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pearson correlation heatmap (numeric features)</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? (
          <Skeleton className="h-[520px]" />
        ) : error ? (
          <p className="text-sm text-danger">
            {(error as { message?: string }).message ?? "Failed to load correlation"}
          </p>
        ) : data ? (
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0">
              <HeatmapChart columns={data.columns} matrix={data.matrix} />
            </div>
            <aside className="rounded-md border bg-muted/10 p-3">
              <h3 className="text-sm font-semibold">Strongest relationships</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Top feature pairs ranked by absolute correlation.
              </p>
              <ol className="mt-3 space-y-2">
                {strongestPairs.map((pair, index) => (
                  <li
                    key={`${pair.left}-${pair.right}`}
                    className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-2 text-xs"
                    title={`${EDA_FIELD_LABELS[pair.left] ?? pair.left} x ${EDA_FIELD_LABELS[pair.right] ?? pair.right}: r = ${formatDecimal(pair.value)}`}
                  >
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span className="min-w-0 leading-4">
                      {EDA_FIELD_LABELS[pair.left] ?? pair.left} x{" "}
                      {EDA_FIELD_LABELS[pair.right] ?? pair.right}
                    </span>
                    <span className="font-semibold tabular-nums">{formatDecimal(pair.value)}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getStrongestCorrelationPairs(columns: string[], matrix: number[][]) {
  const pairs: Array<{ left: string; right: string; value: number }> = [];

  for (let row = 0; row < columns.length; row += 1) {
    for (let column = row + 1; column < columns.length; column += 1) {
      const value = matrix[row]?.[column];
      const left = columns[row];
      const right = columns[column];
      if (
        left !== undefined &&
        right !== undefined &&
        value !== undefined &&
        Number.isFinite(value)
      ) {
        pairs.push({ left, right, value });
      }
    }
  }

  return pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);
}

function DefaultByPanel() {
  const [dim, setDim] = React.useState<string>(DEFAULT_BY_DIMS[0]);
  const { data, isLoading, error } = useEdaDefaultBy(dim);
  const dimId = React.useId();
  const chartData = React.useMemo(
    () =>
      (data ?? [])
        .filter((row) => row.count > 0)
        .sort((a, b) => b.defaultRate - a.defaultRate)
        .map((row) => ({
          group: (CATEGORY_LABELS[dim as keyof typeof CATEGORY_LABELS] as Record<string, string> | undefined)?.[row.group] ?? friendlyRuleValue(row.group, dim),
          defaultRate: row.defaultRate,
          defaultPct: Math.round(row.defaultRate * 1000) / 10,
          count: row.count,
          defaults: row.defaultCount,
        })),
    [data, dim],
  );
  const totalCustomers = chartData.reduce((sum, row) => sum + row.count, 0);
  const totalDefaults = chartData.reduce((sum, row) => sum + row.defaults, 0);
  const overallDefaultRate = totalCustomers > 0 ? totalDefaults / totalCustomers : 0;
  const overallDefaultPct = Math.round(overallDefaultRate * 1000) / 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Default rate grouped by dimension</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 sm:w-[260px]">
          <Label htmlFor={dimId} className="text-xs text-muted-foreground">
            Dimension
          </Label>
          <Select value={dim} onValueChange={setDim}>
            <SelectTrigger id={dimId} className="w-full sm:w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_BY_DIMS.map((dimension) => (
                <SelectItem key={dimension} value={dimension}>
                  {EDA_FIELD_LABELS[dimension] ?? dimension}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : error ? (
          <p className="text-sm text-danger">
            {(error as { message?: string }).message ?? "Failed to load default-by data"}
          </p>
        ) : data && chartData.length > 0 ? (
          <>
            <div role="img" aria-label={`Default rate by ${EDA_FIELD_LABELS[dim] ?? dim}`}>
              <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 30)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                  <YAxis dataKey="group" type="category" width={104} tick={CHART_AXIS_TICK} />
                  <XAxis type="number" domain={[0, 100]} tick={CHART_AXIS_TICK} tickFormatter={(value: number) => formatPct(value / 100, 0)} />
                  <Tooltip {...CHART_TOOLTIP_PROPS} formatter={(value: number) => [formatPct(value / 100), "Default rate"]} />
                  <ReferenceLine
                    x={overallDefaultPct}
                    stroke={CHART_SEMANTIC.baseline}
                    strokeDasharray="5 4"
                    label={{
                      value: `Portfolio ${formatPct(overallDefaultRate)}`,
                      position: "insideTopRight",
                      fill: "hsl(var(--foreground))",
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="defaultPct"
                    name="Default %"
                    maxBarSize={96}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  >
                    {chartData.map((row) => (
                      <Cell
                        key={row.group}
                        fill={
                          row.defaultRate > overallDefaultRate
                            ? CHART_SEMANTIC.danger
                            : CHART_SEMANTIC.neutral
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 text-right font-medium">Count</th>
                    <th className="px-3 py-2 text-right font-medium">Default</th>
                    <th className="px-3 py-2 text-right font-medium">Default rate</th>
                    <th className="px-3 py-2 text-right font-medium">Lift vs base</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.group} className="border-b last:border-b-0">
                      <td className="px-3 py-1.5 font-medium">{row.group}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatInt(row.count)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatInt(row.defaults)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatPct(row.defaultRate)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                        {overallDefaultRate > 0
                          ? formatMultiplier(row.defaultRate / overallDefaultRate)
                          : "n/a"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : data ? (
          <p className="text-sm text-muted-foreground">
            No client groups with observations are available for this dimension.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
