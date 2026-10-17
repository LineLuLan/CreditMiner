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
import { friendlyRuleValue } from "@/lib/rules-format";
import { PAY_STATUS_LABELS, featureLabel } from "@/lib/constants";
import type { EdaDefaultGroup, MiningReport } from "@/types/api.types";
import { DataPreparationCharts } from "./DataPreparationCharts";
import { imputationSentence } from "./report-copy";
import {
  EmptyEvidence,
  ReportDetails,
  ReportFigure,
  ReportSection,
  ReportTable,
} from "./ReportPrimitives";

export function DataUnderstandingSection({
  report,
  defaultBy,
  defaultDimension,
}: {
  report: MiningReport;
  defaultBy?: EdaDefaultGroup[];
  defaultDimension: string;
}) {
  const classBalance = report.dataset.defaultBreakdown.map((row) => ({
    name: row.name === "Yes" ? "Default" : "Non-default",
    value: row.count,
  }));
  const tiers = Object.entries(report.dataset.riskTierBreakdown).sort(
    ([left], [right]) => tierRank(left) - tierRank(right) || left.localeCompare(right),
  );
  const chartData = (defaultBy ?? [])
    .filter((row) => row.count > 0)
    .map((row) => {
      const label = friendlyRuleValue(row.group, defaultDimension);
      const group = /^PAY_[1-6]$/.test(defaultDimension)
        ? (PAY_STATUS_LABELS[Number(row.group)] ?? row.group)
        : label;
      return { ...row, group: `${group} (n=${formatInt(row.count)})` };
    });
  const maxRate =
    Math.max(report.dataset.defaultRate, ...chartData.map((row) => row.defaultRate), 0.2) * 1.12;
  const dimensionLabel = defaultDimensionLabel(defaultDimension);

  return (
    <ReportSection
      id="section-3"
      title="3 Data understanding"
      takeaway={`${formatPct(report.dataset.defaultRate)} of ${formatInt(report.dataset.totalRows)} clients defaulted the next month.`}
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
          caption={`Default class balance for ${formatInt(report.dataset.totalRows)} clients.`}
        >
          <Card className="break-inside-avoid">
            <CardContent className="report-chart p-3">
              <DonutChart data={classBalance} height={250} />
            </CardContent>
          </Card>
        </ReportFigure>
        <ReportTable id="tier-balance" caption="Risk-tier balance in the prepared dataset.">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Tier</th>
                <th className="p-3 text-right">Clients</th>
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
        id="default-dimension"
        caption={`Default rate by ${dimensionLabel}. The dashed line shows the portfolio rate.`}
      >
        {chartData.length > 0 ? (
          <Card className="break-inside-avoid">
            <CardContent className="p-3">
              <div
                className="report-chart h-72 w-full"
                role="img"
                aria-label={`Default rate by ${dimensionLabel}`}
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
                      x={report.dataset.defaultRate}
                      stroke={CHART_SEMANTIC.warning}
                      strokeDasharray="5 4"
                    />
                    <Bar
                      dataKey="defaultRate"
                      name="Default rate"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={false}
                    >
                      {chartData.map((row) => (
                        <Cell
                          key={row.group}
                          fill={
                            row.defaultRate > report.dataset.defaultRate
                              ? CHART_SEMANTIC.danger
                              : CHART_SEMANTIC.neutral
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
            Default-by-dimension evidence is unavailable. The report remains readable without it.
          </EmptyEvidence>
        )}
      </ReportFigure>
      <ReportDetails>
        <p>Groups with fewer than 100 clients can change sharply. Read their rates with care.</p>
        <p className="mt-2 break-words [overflow-wrap:anywhere]">
          Source: UCI Machine Learning Repository, dataset 350 (Yeh &amp; Lien, 2009), {report.methodology?.preprocessing?.rowsIn == null ? "" : `${formatInt(report.methodology.preprocessing.rowsIn)} clients, `}
          Taiwan, April-September 2005. Artifact attribution:{" "}
          {report.methodology?.datasetSource ?? "not available"}.
        </p>
      </ReportDetails>
    </ReportSection>
  );
}

export function DataPreparationSection({ report }: { report: MiningReport }) {
  const preprocessing = report.methodology?.preprocessing;
  const engineering = report.methodology?.featureEngineering;
  const rewrites = Object.entries(preprocessing?.unknownRewritten ?? {});
  const mappingRules = Object.entries(preprocessing?.categoryMappingRules ?? {});
  const negativeBills = Object.entries(preprocessing?.negativeBillByColumn ?? {});
  const outliers = Object.entries(preprocessing?.outlierByColumn ?? {});
  const features = engineering?.derivedFeatures ?? [];
  const rawDelay = features.find((feature) => feature.name === "MAX_DELAY");
  const clippedDelay = report.clustering.clusters[0]?.baseline?.longestDelayMonths;

  return (
    <ReportSection
      id="section-4"
      title="4 Data preparation"
      takeaway={`Preparation keeps ${formatInt(preprocessing?.rowsOut ?? report.dataset.totalRows)} client rows. It flags outliers without deleting them.`}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Phase 1 maps categorical codes to labels and rewrites undocumented codes to Other.
        Phase 2 removes duplicate rows and records outlier flags; negative bill values and flagged rows are retained.
      </p>
      <DataPreparationCharts rewrites={rewrites} outliers={outliers} />
      <ReportDetails label="Data tables" className="report-detail-print">
        <div className="grid gap-5 lg:grid-cols-2">
          <ReportTable
            id="unknown-rewrites"
            caption="Categorical codes mapped to labels; undocumented codes rewritten to Other."
          >
            <SimpleTable
              headers={["Column", "Mapping rule", "Undocumented rows -> Other"]}
              rows={mappingRules.map(([name, rule]) => [
                name,
                rule,
                preprocessing?.unknownRewritten ? formatInt(preprocessing.unknownRewritten[name] ?? 0) : "n/a",
              ])}
            />
          </ReportTable>
          <ReportTable
            id="negative-bill-counts"
            caption={`${formatMaybeInt(preprocessing?.negativeBillTotal)} negative bill amounts retained as valid credit balances.`}
          >
            <SimpleTable
              headers={["Bill column", "Negative values"]}
              rows={negativeBills.map(([name, count]) => [name, formatInt(count)])}
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
          {imputationSentence(preprocessing)}{" "}
          Unknown categories get explicit labels. Negative bill
          amounts and flagged outliers stay in the data.
        </p>
      </ReportDetails>
      <ReportTable
        id="engineered-features"
        caption={<>
          {`${features.length} derived features from ${engineering?.columnsIn ?? "?"} input columns.`}
          {rawDelay ? <span className="mt-1 block">
            Codes below 0 mean paid in full or no card use; the Personas page reports the clipped mean (codes &lt; 0 counted as 0)
            {clippedDelay != null && rawDelay.mean != null
              ? `, e.g. portfolio ${clippedDelay.toFixed(1)} months vs raw ${rawDelay.mean.toFixed(2)}.`
              : "."}
          </span> : null}
        </>}
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
                <td className="break-words p-3 font-semibold">{featureLabel(feature.name ?? "n/a")}</td>
                <td className="p-3">{feature.type ?? "n/a"}</td>
                <td className="max-w-md whitespace-normal break-words p-3 font-mono">
                  {feature.formula ?? "n/a"}
                </td>
                {[feature.mean, feature.std, feature.min, feature.max].map((value, index) => (
                  <td key={index} className="p-3 tabular-nums" title={feature.type === "nominal" ? "not applicable" : undefined}>
                    {feature.type === "nominal" ? "-" : value == null ? "n/a" : feature.name === "BILL_TREND" ? formatPct(value) : value.toFixed(4)}
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
  const order: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
  return order[tier] ?? Number.MAX_SAFE_INTEGER;
}

function defaultDimensionLabel(dimension: string): string {
  return featureLabel(dimension);
}
