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
  CHART_SEMANTIC,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import type { SequencePattern } from "@/components/report/sequence-data";
import { formatPct } from "@/lib/utils";
import { humanisePattern } from "@/lib/sequence-format";

export function SequenceSupportChart({ patterns }: { patterns: SequencePattern[] }) {
  const data = patterns.map((pattern) => ({
    ...pattern,
    displayText: humanisePattern(pattern).text,
    shortPattern: shortenPattern(humanisePattern(pattern).text),
  }));

  return (
    <div
      className="report-chart h-[420px] min-w-0 w-full"
      role="img"
      aria-label="Default and non-default support for sequence patterns"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 12, left: 12 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, "dataMax"]}
            tick={CHART_AXIS_TICK}
            tickFormatter={(value: number) => formatPct(value, 0)}
          />
          <YAxis
            type="category"
            dataKey="shortPattern"
            width={190}
            tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
          />
          <Tooltip
            {...CHART_TOOLTIP_PROPS}
            labelFormatter={(_, payload) => payload[0]?.payload.displayText ?? "Pattern"}
            formatter={(value: number, name: string) => [formatPct(value), name]}
          />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          <Bar
            dataKey="supportDefault"
            name="Default support"
            fill={CHART_SEMANTIC.danger}
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="supportNonDefault"
            name="Non-default support"
            fill={CHART_SEMANTIC.neutral}
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortenPattern(pattern: string): string {
  return pattern.length > 31 ? `${pattern.slice(0, 28)}...` : pattern;
}
