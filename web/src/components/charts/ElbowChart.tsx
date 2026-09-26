"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_SEMANTIC,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";

interface ElbowPoint {
  k: number;
  wcss: number;
  silhouette: number;
}

export function ElbowChart({
  data,
  bestK,
  metric,
}: {
  data: ElbowPoint[];
  bestK: number;
  metric: "wcss" | "silhouette";
}) {
  const label = metric === "wcss" ? "Within-cluster sum of squares" : "Silhouette score";
  return (
    <div className="report-chart h-72 w-full" role="img" aria-label={`${label} by cluster count`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 28, right: 24, bottom: 10, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="k"
            tick={CHART_AXIS_TICK}
            label={{ value: "Clusters (k)", position: "insideBottom", offset: -6 }}
          />
          <YAxis tick={CHART_AXIS_TICK} domain={["auto", "auto"]} width={58} />
          <Tooltip
            {...CHART_TOOLTIP_PROPS}
            formatter={(value: number) =>
              value.toLocaleString("en-US", { maximumFractionDigits: 4 })
            }
          />
          <ReferenceLine
            x={bestK}
            stroke={CHART_SEMANTIC.warning}
            strokeDasharray="5 4"
            label={{ value: `Chosen k=${bestK}`, position: "top", fill: "hsl(var(--foreground))" }}
          />
          <Line
            type="monotone"
            dataKey={metric}
            name={label}
            stroke={CHART_SEMANTIC.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
