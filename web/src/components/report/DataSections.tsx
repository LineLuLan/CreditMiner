"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DonutChart } from "@/components/charts/DonutChart";
import {
  CHART_AXIS_TICK,
  CHART_SEMANTIC,
  CHART_TOOLTIP_PROPS,
} from "@/components/charts/chart-theme";
import { Card, CardContent } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { EdaChurnGroup, MiningReport } from "@/types/api.types";
import { DataPreparationCharts } from "./DataPreparationCharts";
import {
  EmptyEvidence,
  ReportDetails,
  ReportFigure,
  ReportSection,
  ReportTable,
} from "./ReportPrimitives";

export function DataUnderstandingSection({
  report,
  churnBy,
  churnDimension,
}: {
  report: MiningReport;
  churnBy?: EdaChurnGroup[];
  churnDimension: string;
}) {
  const attrition = report.dataset.attritionBreakdown.map((row) => ({
    name: row.name.replace("Attrited Customer", "Churn").replace("Existing Customer", "Active"),
    value: row.count,
  }));
  const tiers = Object.entries(report.dataset.tierBreakdown).sort(
    ([left], [right]) => tierRank(left) - tierRank(right) || left.localeCompare(right),
  );
  const chartData = (churnBy ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({ ...row, group: `${row.group} (n=${formatInt(row.count)})` }));
  const maxRate =
    Math.max(report.dataset.churnRate, ...chartData.map((row) => row.churnRate), 0.2) * 1.12;

  return (
    <ReportSection
      id="section-3"
      title="3 Data understanding"
      takeaway={`${formatPct(report.dataset.churnRate)} of ${formatInt(report.dataset.totalRows)} customers churn.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DataMetric label="Rows" value={formatInt(report.dataset.totalRows)} />
        <DataMetric label="Columns" value={formatInt(report.dataset.totalColumns)} />
        <DataMetric label="Numeric" value={formatInt(report.dataset.numericColumns)} />
        <DataMetric label="Categorical" value={formatInt(report.dataset.categoricalColumns)} />
      </div>
      <div className="report-chart-grid grid gap-5 lg:grid-cols-2">
        <ReportFigure
          id="class-balance"
          caption={`Class balance for ${formatInt(report.dataset.totalRows)} customers.`}
        >
          <Card className="break-inside-avoid">
            <CardContent className="report-chart p-3">
              <DonutChart data={attrition} height={250} />
            </CardContent>
          </Card>
        </ReportFigure>
        <ReportTable id="tier-balance" caption="Customer-tier balance in the prepared dataset.">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Tier</th>
                <th className="p-3 text-right">Customers</th>
                <th className="p-3 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(([tier, count]) => (
                <tr key={tier} className="border-b last:border-0">
                  <td className="p-3 font-medium">{tier}</td>
                  <td className="p-3 text-right tabular-nums">{formatInt(count)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {formatPct(count / report.dataset.totalRows)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTable>
      </div>
      <ReportFigure
        id="churn-dimension"
        caption={`Churn rate by ${churnDimension}. The dashed line shows the portfolio rate.`}
      >
        {chartData.length > 0 ? (
          <Card className="break-inside-avoid">
            <CardContent className="p-3">
              <div
                className="report-chart h-72 w-full"
                role="img"
                aria-label={`Churn rate by ${churnDimension}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 12, right: 28, bottom: 8, left: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, maxRate]}
                      tick={CHART_AXIS_TICK}
                      tickFormatter={(value: number) => formatPct(value, 0)}
                    />
                    <YAxis
                      type="category"
                      dataKey="group"
                      width={110}
                      tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
                    />
                    <Tooltip
                      {...CHART_TOOLTIP_PROPS}
                      formatter={(value: number) => formatPct(value)}
                    />
                    <ReferenceLine
                      x={report.dataset.churnRate}
                      stroke={CHART_SEMANTIC.warning}
                      strokeDasharray="5 4"
                    />
                    <Bar
                      dataKey="churnRate"
                      name="Churn rate"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={false}
                    >
                      {chartData.map((row) => (
                        <Cell
                          key={row.group}
                          fill={
                            row.churnRate > report.dataset.churnRate
                              ? CHART_SEMANTIC.destructive
                              : CHART_SEMANTIC.primary
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyEvidence>
            Churn-by-dimension evidence is unavailable; the report remains readable without it.
          </EmptyEvidence>
        )}
      </ReportFigure>
      <ReportDetails>
        <p>Groups with fewer than 100 customers can change sharply. Read their rates with care.</p>
      </ReportDetails>
    </ReportSection>
  );
}

export function DataPreparationSection({ report }: { report: MiningReport }) {
  const preprocessing = report.methodology?.preprocessing;
  const engineering = report.methodology?.featureEngineering;
  const rewrites = Object.entries(preprocessing?.unknownRewritten ?? {});
  const outliers = Object.entries(preprocessing?.outlierByColumn ?? {});
  const features = engineering?.derivedFeatures ?? [];

  return (
    <ReportSection
      id="section-4"
      title="4 Data preparation"
      takeaway={`Preparation keeps ${formatInt(preprocessing?.rowsOut ?? report.dataset.totalRows)} customer rows and flags outliers without deleting them.`}
    >
      <DataPreparationCharts rewrites={rewrites} outliers={outliers} />
      <ReportDetails label="Data tables" className="report-detail-print">
        <div className="grid gap-5 lg:grid-cols-2">
          <ReportTable
            id="unknown-rewrites"
            caption="Unknown categorical values rewritten during preparation."
          >
            <SimpleTable
              headers={["Column", "Rows"]}
              rows={rewrites.map(([name, count]) => [name, formatInt(count)])}
            />
          </ReportTable>
          <ReportTable
            id="outlier-counts"
            caption={`Outlier counts by column. Policy: ${preprocessing?.outlierPolicy ?? "not available"}.`}
          >
            <SimpleTable
              headers={["Column", "Z-score", "IQR", "Combined"]}
              rows={outliers.map(([name, value]) => [
                name,
                formatMaybeInt(value.zscoreCount),
                formatMaybeInt(value.iqrCount),
                formatMaybeInt(value.combinedCount),
              ])}
            />
          </ReportTable>
        </div>
        <p className="mt-3">
          Numeric gaps use median values. Unknown categories get explicit labels. Outliers stay in
          the data.
        </p>
      </ReportDetails>
      <ReportTable
        id="engineered-features"
        caption={`${features.length} derived features from ${engineering?.columnsIn ?? "?"} input columns.`}
      >
        <table className="w-full min-w-[820px] text-xs">
          <thead>
            <tr className="border-b bg-muted/30">
              {["Feature", "Type", "Formula", "Mean", "Std", "Min", "Max"].map((head) => (
                <th key={head} className="p-3 text-left font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.name} className="border-b last:border-0">
                <td className="break-words p-3 font-semibold">{feature.name ?? "n/a"}</td>
                <td className="p-3">{feature.type ?? "n/a"}</td>
                <td className="max-w-md whitespace-normal break-words p-3 font-mono">
                  {feature.formula ?? "n/a"}
                </td>
                {[feature.mean, feature.std, feature.min, feature.max].map((value, index) => (
                  <td key={index} className="p-3 tabular-nums">
                    {value == null ? "n/a" : value.toFixed(4)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTable>
      <ReportDetails label="Preparation notes">
        <p>
          Leakage columns removed:{" "}
          {(preprocessing?.leakageColumnsDropped ?? report.dataset.leakageColumnsDropped).join(
            ", ",
          ) || "none"}
          . Duplicate rows removed: {formatMaybeInt(preprocessing?.duplicatesDropped)}.
        </p>
      </ReportDetails>
    </ReportSection>
  );
}

function DataMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="break-inside-avoid">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          {headers.map((head) => (
            <th key={head} className="p-3 text-left font-medium">
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="break-words p-3 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={headers.length} className="p-4 text-center text-muted-foreground">
              No rows reported.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function formatMaybeInt(value: number | undefined): string {
  return value == null ? "n/a" : formatInt(value);
}

function tierRank(tier: string): number {
  const order: Record<string, number> = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
  return order[tier] ?? Number.MAX_SAFE_INTEGER;
}
