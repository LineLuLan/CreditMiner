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
import { Card, CardContent } from "@/components/ui/card";
import { formatPct } from "@/lib/utils";
import type { EvaluationVariant } from "@/types/api.types";
import type { ComparisonRow } from "./ClassificationSection";
import { ReportFigure } from "./ReportPrimitives";
import { modelLabel } from "./model-labels";

export function ModelComparisonChart({
  rows,
  best,
}: {
  rows: ComparisonRow[];
  best?: EvaluationVariant;
}) {
  const data = rows.map((row) => ({
    label: modelLabel(row.model, row.variant),
    f1: row.testF1,
    prAuc: row.testPrAuc,
    isBest: row.model === best?.algo && row.variant === best?.variant,
  }));
  return (
    <ReportFigure
      id="model-comparison-chart"
      caption="Held-out F1 and PR-AUC by model variant. The bold label marks the best variant."
    >
      <Card className="break-inside-avoid">
        <CardContent className="p-3">
          <div
            className="report-chart h-[380px] w-full"
            role="img"
            aria-label="Held-out F1 and PR-AUC by model variant"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={CHART_AXIS_TICK}
                  tickFormatter={(value: number) => formatPct(value, 0)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={148}
                  interval={0}
                  tick={({ x, y, payload }) => {
                    const isBest = data.find((row) => row.label === payload.value)?.isBest;
                    return <text x={x} y={y} dy={3} textAnchor="end" {...CHART_AXIS_TICK} fontSize={10} fontWeight={isBest ? 700 : 400}>{isBest ? "Best: " : ""}{payload.value}</text>;
                  }}
                />
                <Tooltip
                  {...CHART_TOOLTIP_PROPS}
                  formatter={(value: number, name: string) => [formatPct(value), name]}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="f1" name="Test F1" fill={CHART_SEMANTIC.primary} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                <Bar
                  dataKey="prAuc"
                  name="Test PR-AUC"
                  fill={CHART_SEMANTIC.success}
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ReportFigure>
  );
}
