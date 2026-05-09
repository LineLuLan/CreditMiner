"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HistogramChart } from "@/components/charts/HistogramChart";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { CHURN_BY_DIMS, EDA_NUMERIC_COLS } from "@/lib/constants";
import { formatInt, formatPct } from "@/lib/utils";
import {
  useEdaChurnBy,
  useEdaCorrelation,
  useEdaDistribution,
} from "@/hooks/useEda";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function EdaPage() {
  return (
    <div className="flex flex-col">
      <Header title="Exploratory Data Analysis" />
      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="distribution">
          <TabsList>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="correlation">Correlation</TabsTrigger>
            <TabsTrigger value="churn-by">Churn by dimension</TabsTrigger>
          </TabsList>
          <TabsContent value="distribution">
            <DistributionPanel />
          </TabsContent>
          <TabsContent value="correlation">
            <CorrelationPanel />
          </TabsContent>
          <TabsContent value="churn-by">
            <ChurnByPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DistributionPanel() {
  const [col, setCol] = React.useState<string>(EDA_NUMERIC_COLS[0]);
  const [bins, setBins] = React.useState<number>(20);
  const { data, isLoading, error } = useEdaDistribution(col, bins);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single-column histogram</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Column</Label>
            <Select value={col} onValueChange={setCol}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDA_NUMERIC_COLS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bins ({bins})</Label>
            <Input
              type="range"
              min={5}
              max={50}
              value={bins}
              onChange={(e) => setBins(Number(e.target.value))}
              className="w-[200px]"
            />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load distribution"}
          </p>
        ) : data ? (
          <HistogramChart binEdges={data.binEdges} counts={data.counts} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CorrelationPanel() {
  const { data, isLoading, error } = useEdaCorrelation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pearson correlation heatmap (numeric features)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[600px]" />
        ) : error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load correlation"}
          </p>
        ) : data ? (
          <HeatmapChart columns={data.columns} matrix={data.matrix} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChurnByPanel() {
  const [dim, setDim] = React.useState<string>(CHURN_BY_DIMS[0]);
  const { data, isLoading, error } = useEdaChurnBy(dim);

  const chartData = React.useMemo(
    () =>
      (data ?? []).map((row) => ({
        group: row.group,
        churnPct: Math.round(row.churnRate * 1000) / 10,
        count: row.count,
        attrited: row.attritedCount,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Churn rate grouped by dimension</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Dimension</Label>
          <Select value={dim} onValueChange={setDim}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHURN_BY_DIMS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load churn-by data"}
          </p>
        ) : data ? (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="group" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="churnPct" name="Churn %" radius={[4, 4, 0, 0]}>
                  {chartData.map((row, i) => (
                    <Cell
                      key={i}
                      fill={
                        row.churnPct >= 25
                          ? "#ef4444"
                          : row.churnPct >= 18
                            ? "#f59e0b"
                            : "#10b981"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Group</th>
                    <th className="py-2 pr-4 text-right font-medium">Count</th>
                    <th className="py-2 pr-4 text-right font-medium">Attrited</th>
                    <th className="py-2 pr-4 text-right font-medium">Churn rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.group} className="border-b last:border-b-0">
                      <td className="py-1.5 pr-4 font-medium">{row.group}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatInt(row.count)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatInt(row.attritedCount)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatPct(row.churnRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
