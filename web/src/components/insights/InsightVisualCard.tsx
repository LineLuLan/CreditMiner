"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_AXIS_TICK, CHART_SEMANTIC } from "@/components/charts/chart-theme";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight, InsightVisual, InsightVisualBar } from "@/types/api.types";

interface InsightVisualCardProps {
  insight: Insight;
  visual?: InsightVisual;
  detailsOpen?: boolean;
  onDetailsToggle?: (open: boolean) => void;
  className?: string;
}

export function InsightVisualCard({
  insight,
  visual,
  detailsOpen,
  onDetailsToggle,
  className,
}: InsightVisualCardProps) {
  const chartMax = visual
    ? Math.max(1, visual.baseline?.value ?? 0, ...visual.bars.map((bar) => bar.value)) * 1.24
    : 1;
  const highlightedLabels = visual?.bars
    .filter((bar) => bar.highlight)
    .map((bar) => bar.label)
    .join(", ");

  return (
    <Card className={cn("insight-card min-w-0 break-inside-avoid overflow-hidden", className)}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={insight.category === "churn" ? "destructive" : "secondary"}>
            {insight.category}
          </Badge>
          <Badge variant="outline">Priority {insight.priority}</Badge>
          {visual?.lift ? <Badge className="ml-auto">{visual.lift} base</Badge> : null}
        </div>
        <CardTitle className="text-lg leading-snug">{insight.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visual ? (
          <>
            <div className="flex items-end gap-3 border-l-4 border-primary pl-4">
              <p className="shrink-0 text-4xl font-bold tracking-tight tabular-nums">
                {visual.headline.value}
              </p>
              <p className="pb-1 text-sm leading-5 text-muted-foreground">
                {visual.headline.label}
              </p>
            </div>
            {visual.bars.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{visual.axis}</p>
                <div
                  className="h-64 min-w-0"
                  role="img"
                  aria-label={[
                    visual.axis,
                    `${visual.headline.value} ${visual.headline.label}`,
                    visual.baseline?.label,
                    highlightedLabels ? `Highlighted: ${highlightedLabels}` : null,
                  ]
                    .filter(Boolean)
                    .join(". ")}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visual.bars}
                      layout="vertical"
                      margin={{ top: 12, right: 52, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, chartMax]} hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={104}
                        tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                        content={(props) => (
                          <InsightChartTooltip
                            active={props.active}
                            bar={props.payload?.[0]?.payload as InsightVisualBar | undefined}
                            unit={visual.unit}
                          />
                        )}
                      />
                      {visual.baseline ? (
                        <ReferenceLine
                          x={visual.baseline.value}
                          stroke={CHART_SEMANTIC.warning}
                          strokeDasharray="5 4"
                          label={{
                            value: visual.baseline.label,
                            position: "insideTopRight",
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 10,
                          }}
                        />
                      ) : null}
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        {visual.bars.map((bar) => (
                          <Cell
                            key={bar.label}
                            fill={
                              bar.highlight
                                ? CHART_SEMANTIC.destructive
                                : "hsl(var(--primary) / 0.58)"
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="right"
                          fill="hsl(var(--foreground))"
                          fontSize={11}
                          formatter={(value: number) => formatBarValue(value, visual.unit)}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <p className="insight-action text-sm leading-6">
          <span className="font-semibold">Action:</span> {insight.recommendation}
        </p>

        <details
          open={detailsOpen}
          onToggle={(event) => onDetailsToggle?.(event.currentTarget.open)}
          className="insight-details group"
        >
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none">
            Details
          </summary>
          <div className="mt-3 space-y-3 rounded-lg bg-muted/35 p-4 text-sm leading-6">
            <div>
              <p className="font-semibold">Discovery</p>
              <p className="text-muted-foreground">{insight.discovery}</p>
            </div>
            <div>
              <p className="font-semibold">Evidence</p>
              <p className="text-muted-foreground">{insight.evidence}</p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function InsightChartTooltip({
  active,
  bar,
  unit,
}: {
  active?: boolean;
  bar?: InsightVisualBar;
  unit: string;
}) {
  if (!active || !bar) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="font-semibold">{bar.label}</p>
      <p className="mt-1">
        {formatBarValue(bar.value, unit)}, n={bar.n.toLocaleString()}
      </p>
    </div>
  );
}

function formatBarValue(value: number, unit: string): string {
  if (unit.trim().startsWith("%")) return `${value.toFixed(1)}%`;
  return `${value.toLocaleString()} ${unit}`;
}
