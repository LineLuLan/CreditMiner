"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_LEGEND_STYLE,
  CHART_SEMANTIC,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";

interface HistogramSeries {
  label: string;
  counts: number[];
}

interface Props {
  binEdges: number[];
  categories?: string[];
  counts: number[];
  series?: HistogramSeries[] | null;
  height?: number;
}

/** Display aggregate or class-split distribution counts on shared bins. */
export function HistogramChart({ binEdges, categories = [], counts, series, height = 320 }: Props) {
  const activeSeries = series?.filter((item) => item.counts.length > 0) ?? [];
  const itemCount = activeSeries.length > 0 ? (activeSeries[0]?.counts.length ?? 0) : counts.length;
  const data = Array.from({ length: itemCount }, (_, index) => {
    const row: Record<string, string | number> = {
      range:
        categories[index] ?? `${formatEdge(binEdges[index])}-${formatEdge(binEdges[index + 1])}`,
      count: counts[index] ?? 0,
    };

    for (const item of activeSeries) {
      row[item.label] = item.counts[index] ?? 0;
    }

    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="range"
          angle={-30}
          textAnchor="end"
          height={64}
          interval="preserveStartEnd"
          tick={CHART_AXIS_TICK}
        />
        <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
        <Tooltip {...CHART_TOOLTIP_PROPS} />
        {activeSeries.length > 0 ? (
          <>
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            {activeSeries.map((item, index) => (
              <Bar
                key={item.label}
                dataKey={item.label}
                fill={
                  item.label === "Attrited Customer"
                    ? CHART_SEMANTIC.destructive
                    : item.label === "Existing Customer" || index === 0
                      ? CHART_SEMANTIC.primary
                      : CHART_SEMANTIC.success
                }
                maxBarSize={72}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </>
        ) : (
          <Bar
            dataKey="count"
            name="Customers"
            fill={CHART_SEMANTIC.primary}
            maxBarSize={96}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

function formatEdge(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}
