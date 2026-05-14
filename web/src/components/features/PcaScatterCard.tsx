"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEdaPca2d } from "@/hooks/useEda";
import { CLUSTER_COLORS } from "@/lib/constants";
import type { PcaPoint } from "@/types/api.types";

const TARGET_PER_CLUSTER = 300;

export function PcaScatterCard() {
  const { data, isLoading, error } = useEdaPca2d();

  const grouped = React.useMemo(() => {
    if (!data) return new Map<number, PcaPoint[]>();
    const buckets = new Map<number, PcaPoint[]>();
    for (const p of data) {
      const arr = buckets.get(p.clusterId) ?? [];
      arr.push(p);
      buckets.set(p.clusterId, arr);
    }
    const sampled = new Map<number, PcaPoint[]>();
    for (const [k, arr] of buckets.entries()) {
      const stride = Math.max(1, Math.floor(arr.length / TARGET_PER_CLUSTER));
      const out: PcaPoint[] = [];
      for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
      sampled.set(k, out);
    }
    return sampled;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          PCA-2D scatter
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            first 2 principal components · colored by cluster
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load PCA-2D data"}
          </p>
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="x"
                name="PC1"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="PC2"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <ZAxis range={[20, 20]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [value.toFixed(3), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {[...grouped.entries()].sort(([a], [b]) => a - b).map(([clusterId, pts]) => (
                <Scatter
                  key={clusterId}
                  name={`C${clusterId}`}
                  data={pts}
                  fill={CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]}
                  fillOpacity={0.55}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Showing ~{TARGET_PER_CLUSTER} sampled points per cluster (full source: 10,127 points).
        </p>
      </CardContent>
    </Card>
  );
}
