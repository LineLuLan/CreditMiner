"use client";

import {
  CartesianGrid,
  Legend,
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
  CHART_COLORS,
  CHART_LEGEND_STYLE,
  CHART_SEMANTIC,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import { formatPct } from "@/lib/utils";
import type { EvaluationVariant } from "@/types/api.types";

export function PrCurveChart({
  variants,
  prevalence,
}: {
  variants: EvaluationVariant[];
  prevalence: number;
}) {
  return (
    <div
      className="report-chart h-80 w-full"
      role="img"
      aria-label={`Precision-recall curves for canonical models with a ${formatPct(prevalence)} prevalence baseline`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart margin={{ top: 12, right: 18, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="recall"
            domain={[0, 1]}
            tick={CHART_AXIS_TICK}
            tickFormatter={(value) => formatPct(value, 0)}
            label={{ value: "Recall", position: "insideBottom", offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="precision"
            domain={[0, 1]}
            tick={CHART_AXIS_TICK}
            tickFormatter={(value) => formatPct(value, 0)}
          />
          <Tooltip {...CHART_TOOLTIP_PROPS} formatter={(value: number) => formatPct(value)} />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          <ReferenceLine
            y={prevalence}
            stroke={CHART_SEMANTIC.warning}
            strokeDasharray="5 4"
            label={{
              value: `Prevalence ${formatPct(prevalence)}`,
              position: "insideTopLeft",
              fill: "hsl(var(--foreground))",
            }}
          />
          {variants.map((variant, index) => (
            <Line
              key={`${variant.algo}-${variant.variant}`}
              data={(variant.prCurve ?? []).filter(
                (point) => point.recall != null && point.precision != null,
              )}
              dataKey="precision"
              name={`${variant.algo} (${variant.variant})`}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
