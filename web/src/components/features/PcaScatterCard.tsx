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
import {
  CHART_AXIS_TICK,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  chartTooltipContentStyle,
} from "@/components/charts/chart-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEdaPca2d, usePcaMeta } from "@/hooks/useEda";
import { CHART_SEMANTIC, clusterColor } from "@/lib/chart-theme";
import { formatDecimal, formatInt, formatPct } from "@/lib/format";
import { pcaView, riskAboveBaseline } from "@/components/clusters/clusters-view";
import type { Cluster, PcaPoint } from "@/types/api.types";

const TARGET_PER_CLUSTER = 300;

export function PcaScatterCard({
  clusters = [],
  baselineRate,
}: {
  clusters?: Cluster[];
  baselineRate?: number;
}) {
  const { data, isLoading, error } = useEdaPca2d();
  const { data: meta } = usePcaMeta();
  const [fullRange, setFullRange] = React.useState(false);
  const view = React.useMemo(() => pcaView(data ?? [], fullRange, meta), [data, fullRange, meta]);
  const grouped = React.useMemo(() => {
    const buckets = new Map<number, PcaPoint[]>();
    for (const point of view.points) {
      const bucket = buckets.get(point.clusterId) ?? [];
      bucket.push(point);
      buckets.set(point.clusterId, bucket);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, points]) => {
        const count = Math.min(TARGET_PER_CLUSTER, points.length);
        const sample = Array.from(
          { length: count },
          (_, i) => points[Math.floor((i * points.length) / count)],
        );
        return { id, sample };
      });
  }, [view]);
  const sampleCount = grouped.reduce((sum, group) => sum + group.sample.length, 0);

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-base">How the personas separate</CardTitle>
          <p className="text-sm text-muted-foreground">
            PCA projects scaled features onto the first two principal components.
          </p>
          {meta?.explainedVariance.length ? (
            <p className="text-xs text-muted-foreground">
              PC1 {formatPct(meta.explainedVariance[0])}; PC2 {formatPct(meta.explainedVariance[1])}
              .{" "}
              {meta.explainedVarianceScope ??
                "Variance share of the two exported components, not of the original feature space."}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-pressed={fullRange}
          onClick={() => setFullRange((value) => !value)}
          disabled={!data?.length}
        >
          {fullRange ? "Show central range" : "Show full range"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <p className="text-sm text-danger">
            {(error as { message?: string }).message ?? "Failed to load PCA-2D data"}
          </p>
        ) : data && data.length > 0 ? (
          <>
            <p className="mb-4 text-xs text-muted-foreground">
              {fullRange
                ? "Full axis range."
                : "Central view: 1st-99th percentile on each axis, calculated from all prepared points."}{" "}
              {formatInt(view.outsideCount)} points outside this view.
              {view.invalidCount > 0
                ? ` ${formatInt(view.invalidCount)} points have unavailable coordinates.`
                : ""}
            </p>
            <div
              role="img"
              aria-label={`PCA scatter plot by persona; ${view.outsideCount} points outside the current axis range`}
            >
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 8, right: 20, bottom: 24, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="PC1"
                    domain={view.xDomain}
                    allowDataOverflow
                    stroke="hsl(var(--muted-foreground))"
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(value: number) => formatDecimal(value, 1)}
                    label={{ value: "PC1", position: "insideBottom", offset: -12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="PC2"
                    domain={view.yDomain}
                    allowDataOverflow
                    stroke="hsl(var(--muted-foreground))"
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(value: number) => formatDecimal(value, 1)}
                    label={{ value: "PC2", angle: -90, position: "insideLeft" }}
                  />
                  <ZAxis range={[20, 20]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={<PcaTooltip clusters={clusters} />}
                  />
                  <Legend wrapperStyle={{ ...CHART_LEGEND_STYLE, paddingTop: 24 }} />
                  {grouped.map(({ id, sample }) => {
                    const cluster = clusters.find((item) => item.clusterId === id);
                    return (
                      <Scatter
                        key={id}
                        name={cluster?.displayName ?? cluster?.personaName ?? `Cluster ${id}`}
                        data={sample}
                        fill={
                          riskAboveBaseline(cluster?.defaultRate, baselineRate)
                            ? clusterColor(cluster?.defaultRate, baselineRate)
                            : CHART_SEMANTIC.neutral
                        }
                        isAnimationActive={false}
                      />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Showing {formatInt(sampleCount)} sampled points (up to {formatInt(TARGET_PER_CLUSTER)}{" "}
              per persona) from {formatInt(meta?.pointCount ?? data.length)} prepared points. Axis
              limits and outside-view counts use all points before sampling.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No PCA points available.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PcaTooltip({
  active,
  payload,
  clusters,
}: {
  active?: boolean;
  payload?: Array<{ payload?: PcaPoint }>;
  clusters: Cluster[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const cluster = clusters.find((item) => item.clusterId === point.clusterId);
  const persona = cluster?.displayName ?? cluster?.personaName;
  return (
    <div style={chartTooltipContentStyle({ minWidth: 128 })}>
      <p style={CHART_TOOLTIP_LABEL_STYLE}>{persona ?? `Cluster ${point.clusterId}`}</p>
      <div style={CHART_TOOLTIP_ITEM_STYLE}>PC1: {formatDecimal(point.x, 3)}</div>
      <div style={CHART_TOOLTIP_ITEM_STYLE}>PC2: {formatDecimal(point.y, 3)}</div>
    </div>
  );
}
