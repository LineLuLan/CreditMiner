"use client";

import { formatDecimal, formatInt, formatNt, formatPct } from "@/lib/format";
import { EDA_FIELD_UNITS } from "@/lib/constants";
import { hasCompleteClassSeries } from "@/app/eda/distribution-bins";
import { friendlyRuleValue } from "@/lib/rules-format";
import { Bar, ComposedChart, CartesianGrid, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_TICK, CHART_LEGEND_STYLE, CHART_SEMANTIC, CHART_TOOLTIP_PROPS } from "@/components/charts/chart-theme";

interface HistogramSeries { label: string; counts: number[]; }
interface Props {
  binEdges: number[];
  categories?: string[];
  counts: number[];
  series?: HistogramSeries[] | null;
  height?: number;
  column?: string;
  baseline?: number;
  tailStart?: number;
  showSplit?: boolean;
}

/** Counts and class rates share exact merged bins; missing class evidence never becomes zero risk. */
export function HistogramChart({ binEdges, categories = [], counts, series, height = 320, column = "", baseline, tailStart, showSplit = true }: Props) {
  const activeSeries = series?.filter((item) => item.counts.length === counts.length) ?? [];
  const defaults = activeSeries.find((item) => item.label === "Yes" || item.label === "Default");
  const hasRates = hasCompleteClassSeries(counts, activeSeries);
  const isMoney = EDA_FIELD_UNITS[column] === "NT$";
  const data = counts.map((count, index) => {
    const tail = tailStart !== undefined && index === counts.length - 1;
    const fullEdge = (value: number) => isMoney ? formatNt(value) : EDA_FIELD_UNITS[column] === "ratio" ? formatPct(value) : formatDecimal(value, 1);
    const row: Record<string, string | number | null> = {
      range: categories[index] ? friendlyRuleValue(categories[index], column) : `${tail ? "> " : ""}${tail && isMoney ? "NT$" : ""}${formatEdge(binEdges[index], column)}`,
      fullRange: categories[index] ? friendlyRuleValue(categories[index], column) : tail ? `Above ${fullEdge(tailStart)}` : `${fullEdge(binEdges[index])} to ${fullEdge(binEdges[index + 1])}`,
      count,
      defaultRate: hasRates && defaults && count > 0 ? defaults.counts[index] / count : null,
    };
    for (const item of activeSeries) row[item.label] = item.counts[index];
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 24, right: 0, left: -12, bottom: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="range" height={42} interval="preserveStartEnd" minTickGap={16} tick={CHART_AXIS_TICK} />
        <YAxis yAxisId="count" allowDecimals={false} width={58} tick={CHART_AXIS_TICK} tickFormatter={(value: number) => formatEdge(value)} />
        {hasRates ? <YAxis yAxisId="rate" orientation="right" domain={[0, 1]} width={40} tick={CHART_AXIS_TICK} tickFormatter={(value: number) => formatPct(value, 0)} /> : null}
        <Tooltip {...CHART_TOOLTIP_PROPS}
          labelFormatter={(_label, payload) => String(payload[0]?.payload?.fullRange ?? "")}
          formatter={(value: number, name: string) => [name === "Default rate per bin" ? formatPct(value) : formatInt(value), name]} />
        <Legend wrapperStyle={CHART_LEGEND_STYLE} />
        {showSplit && hasRates ? activeSeries.map((item) => (
          <Bar key={item.label} yAxisId="count" dataKey={item.label} name={item.label === "Yes" ? "Default" : item.label === "No" ? "Non-default" : item.label}
            stackId="clients" fill={item.label === "Yes" || item.label === "Default" ? CHART_SEMANTIC.danger : CHART_SEMANTIC.neutral}
            maxBarSize={72} isAnimationActive={false} />
        )) : <Bar yAxisId="count" dataKey="count" name="Clients" fill={CHART_SEMANTIC.neutral} maxBarSize={72} radius={[3, 3, 0, 0]} isAnimationActive={false} />}
        {hasRates ? <Line yAxisId="rate" dataKey="defaultRate" name="Default rate per bin" stroke={CHART_SEMANTIC.danger} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /> : null}
        {hasRates && baseline !== undefined ? <ReferenceLine yAxisId="rate" y={baseline} stroke={CHART_SEMANTIC.baseline} strokeDasharray="5 4" label={{ value: `Portfolio ${formatPct(baseline)}`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--foreground))" }} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function formatEdge(value: number | undefined, column = ""): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  if (EDA_FIELD_UNITS[column] === "ratio") return formatPct(value, 0);
  if (Math.abs(value) >= 1000) return `${formatDecimal(value / 1000, Number.isInteger(value / 1000) ? 0 : 1)}k`;
  return formatDecimal(value, Number.isInteger(value) ? 0 : 1);
}
