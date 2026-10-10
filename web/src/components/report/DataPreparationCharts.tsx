"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
import { Card, CardContent } from "@/components/ui/card";
import { formatInt } from "@/lib/utils";
import { ReportFigure } from "./ReportPrimitives";

interface OutlierCounts {
  zscoreCount?: number;
  iqrCount?: number;
  combinedCount?: number;
}

export function DataPreparationCharts({
  rewrites,
  outliers,
}: {
  rewrites: Array<[string, number]>;
  outliers: Array<[string, OutlierCounts]>;
}) {
  const rewriteData = rewrites.map(([name, value]) => ({ name: shortName(name), value }));
  const outlierData = outliers.map(([name, value]) => ({
    name: shortName(name),
    combined: value.combinedCount ?? 0,
    zscore: value.zscoreCount ?? 0,
    iqr: value.iqrCount ?? 0,
  }));

  return (
    <div className="report-chart-grid grid gap-5 lg:grid-cols-2">
      <ReportFigure
        id="unknown-rewrites-chart"
        caption="Unknown categorical values rewritten during preparation."
      >
        <CompactBarChart
          data={rewriteData}
          ariaLabel="Unknown values rewritten by column"
          dataKey="value"
          color={CHART_SEMANTIC.primary}
        />
      </ReportFigure>
      <ReportFigure id="outlier-counts-chart" caption="Combined outlier flags by numeric column.">
        <CompactBarChart
          data={outlierData}
          ariaLabel="Combined outlier flags by column"
          dataKey="combined"
          color={CHART_SEMANTIC.neutral}
        />
      </ReportFigure>
    </div>
  );
}

function CompactBarChart({
  data,
  ariaLabel,
  dataKey,
  color,
}: {
  data: Array<Record<string, string | number>>;
  ariaLabel: string;
  dataKey: string;
  color: string;
}) {
  return (
    <Card className="break-inside-avoid">
      <CardContent className="p-3">
        <div className="report-chart h-64 w-full" role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 52, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={CHART_AXIS_TICK} tickFormatter={formatInt} />
              <YAxis
                type="category"
                dataKey="name"
                width={112}
                tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
              />
              <Tooltip {...CHART_TOOLTIP_PROPS} formatter={(value: number) => formatInt(value)} />
              <Bar
                dataKey={dataKey}
                name="Rows"
                fill={color}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={dataKey}
                  position="right"
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                  formatter={(value: number) => formatInt(value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function shortName(value: string): string {
  return value.replaceAll("_", " ").slice(0, 22);
}
