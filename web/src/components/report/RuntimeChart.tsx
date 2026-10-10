"use client";

import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import { Card, CardContent } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { EvaluationVariant } from "@/types/api.types";
import { EmptyEvidence, ReportDetails, ReportFigure, ReportTable } from "./ReportPrimitives";

export function RuntimeAnalysis({
  variants,
  best,
  figureId = "quality-runtime",
  tableId = "variant-runtime",
  compact = false,
  cvFolds,
}: {
  variants: EvaluationVariant[];
  best?: EvaluationVariant;
  figureId?: string;
  tableId?: string;
  compact?: boolean;
  cvFolds?: number;
}) {
  const points = variants
    .filter((variant) => (variant.buildTimeMs ?? variant.trainTimeMs ?? 0) > 0)
    .map((variant) => ({
      buildTimeMs: variant.buildTimeMs ?? variant.trainTimeMs ?? 0,
      testF1: variant.test?.f1Default ?? 0,
      predictMicrosPerRecord: variant.predictMicrosPerRecord ?? 0,
      label: `${variant.algo ?? "Model"} (${variant.variant ?? "variant"})`,
      bestLabel:
        variant.algo === best?.algo && variant.variant === best?.variant
          ? `Best: ${variant.algo} (${variant.variant})`
          : "",
    }));

  return (
    <div className="space-y-5">
      <ReportFigure
        id={figureId}
        caption="Held-out F1 against model build time. Point area represents prediction time per record."
      >
        {points.length ? (
          <Card>
            <CardContent className="p-3">
              <div
                className="report-chart h-[360px] w-full"
                role="img"
                aria-label="Held-out F1 versus build time for all model variants"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 28, right: 34, bottom: 20, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="buildTimeMs"
                      name="Build time"
                      unit=" ms"
                      scale="log"
                      domain={["dataMin", "dataMax"]}
                      tick={CHART_AXIS_TICK}
                      tickFormatter={compactTime}
                      label={{ value: "Build time (log scale)", position: "insideBottom", offset: -12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="testF1"
                      name="Holdout F1"
                      domain={[0, 1]}
                      tick={CHART_AXIS_TICK}
                      tickFormatter={(value: number) => formatPct(value, 0)}
                    />
                    <ZAxis
                      type="number"
                      dataKey="predictMicrosPerRecord"
                      range={[70, 420]}
                      name="Prediction"
                      unit=" microseconds per record"
                    />
                    <Tooltip
                      {...CHART_TOOLTIP_PROPS}
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value: number, name: string) => [formatRuntimeValue(value, name), name]}
                      labelFormatter={(_, payload) => payload[0]?.payload.label ?? "Variant"}
                    />
                    <Scatter data={points} fill={CHART_COLORS[0]} isAnimationActive={false}>
                      <LabelList
                        dataKey="bestLabel"
                        position="top"
                        fill="hsl(var(--foreground))"
                        fontSize={10}
                        fontWeight={600}
                      />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyEvidence>Model runtime evidence is unavailable.</EmptyEvidence>
        )}
      </ReportFigure>
      {compact ? <ReportDetails label="Runtime table" className="report-detail-print"><RuntimeTable variants={variants} id={tableId} cvFolds={cvFolds} /></ReportDetails> : <RuntimeTable variants={variants} id={tableId} cvFolds={cvFolds} />}
    </div>
  );
}

export function RuntimeTable({ variants, id, cvFolds }: { variants: EvaluationVariant[]; id: string; cvFolds?: number }) {
  return (
    <ReportTable id={id} caption={`Build and prediction runtime for ${variants.length} variants.`}>
      <table className="w-full min-w-[820px] text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-3 text-left">Algorithm</th>
            <th className="p-3 text-left">Variant</th>
            <th className="p-3 text-right">Build</th>
            <th className="p-3 text-right">{cvFolds == null ? "CV" : `${formatInt(cvFolds)}-fold CV`}</th>
            <th className="p-3 text-right">Predict holdout</th>
            <th className="p-3 text-right">Rows</th>
            <th className="p-3 text-right">Microseconds / row</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={`${variant.algo}-${variant.variant}`} className="border-b last:border-0">
              <td className="p-3 font-semibold">{variant.algo ?? "n/a"}</td>
              <td className="p-3">{variant.variant ?? "n/a"}</td>
              <td className="p-3 text-right tabular-nums">
                {formatMaybeMs(variant.buildTimeMs ?? variant.trainTimeMs)}
              </td>
              <td className="p-3 text-right tabular-nums">{formatMaybeMs(variant.cvTimeMs)}</td>
              <td className="p-3 text-right tabular-nums">
                {formatMaybeMs(variant.testPredictTimeMs)}
              </td>
              <td className="p-3 text-right tabular-nums">
                {variant.testRows == null ? "n/a" : formatInt(variant.testRows)}
              </td>
              <td className="p-3 text-right tabular-nums">
                {variant.predictMicrosPerRecord == null
                  ? "n/a"
                  : variant.predictMicrosPerRecord.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function formatMaybeMs(value?: number | null): string {
  return value == null ? "n/a" : `${formatInt(value)} ms`;
}

function compactTime(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function formatRuntimeValue(value: number, name: string): string {
  if (name === "Holdout F1") return formatPct(value);
  if (name === "Build time") return `${formatInt(value)} ms`;
  return value.toFixed(2);
}
