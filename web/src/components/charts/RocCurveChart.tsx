"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_TICK, CHART_COLORS, CHART_LEGEND_STYLE, CHART_SEMANTIC, CHART_TOOLTIP_PROPS } from "@/components/charts/chart-theme";
import { formatPct } from "@/lib/utils";
import type { EvaluationVariant } from "@/types/api.types";
import { modelLabel } from "@/components/report/model-labels";

export function RocCurveChart({ variants }: { variants: EvaluationVariant[] }) {
  return (
    <div className="report-chart h-80 w-full" role="img" aria-label="ROC curves for canonical classification models with a diagonal chance line">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart margin={{ top: 12, right: 18, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="fpr" domain={[0, 1]} tick={CHART_AXIS_TICK} tickFormatter={(value) => formatPct(value, 0)} label={{ value: "False positive rate", position: "insideBottom", offset: -10 }} />
          <YAxis type="number" dataKey="tpr" domain={[0, 1]} tick={CHART_AXIS_TICK} tickFormatter={(value) => formatPct(value, 0)} />
          <Tooltip {...CHART_TOOLTIP_PROPS} formatter={(value: number) => formatPct(value)} />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={CHART_SEMANTIC.baseline} strokeDasharray="5 4" label="Chance" />
          {variants.map((variant, index) => (
            <Line key={`${variant.algo}-${variant.variant}`} data={(variant.rocCurve ?? []).filter((point) => point.fpr != null && point.tpr != null)} dataKey="tpr" name={modelLabel(variant.algo, variant.variant)} stroke={CHART_COLORS[index % CHART_COLORS.length]} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
