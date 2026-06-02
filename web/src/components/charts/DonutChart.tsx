"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  chartTooltipContentStyle,
} from "@/components/charts/chart-theme";
import { CLUSTER_COLORS } from "@/lib/constants";

interface Props {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

const RAD = Math.PI / 180;

function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.04) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 1.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="fill-foreground"
      fontSize={13}
      fontWeight={700}
    >
      {(percent * 100).toFixed(1)}%
    </text>
  );
}

export function DonutChart({ data, height = 260 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="48%"
          outerRadius="72%"
          paddingAngle={2}
          labelLine={false}
          label={renderLabel}
          isAnimationActive
          animationDuration={500}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={chartTooltipContentStyle()}
          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          formatter={(value: number, name: string) => [
            `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={CHART_LEGEND_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
