"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatRuleAntecedent, formatRuleOutcome } from "@/lib/rules-format";
import { formatInt, formatPct } from "@/lib/utils";
import type { MiningReport, Rule } from "@/types/api.types";
import { ReportDetails, ReportTable, Takeaway } from "./ReportPrimitives";

export function RulesSection({
  report,
  churnRules,
  retentionRules,
}: {
  report: MiningReport;
  churnRules?: Rule[];
  retentionRules?: Rule[];
}) {
  const reportChurn = report.rules.topRules.filter((rule) => rule.category === "churn");
  const reportRetention = report.rules.topRules.filter((rule) => rule.category === "retention");
  const churn = uniqueRules([...reportChurn, ...(churnRules ?? [])])
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 10);
  const retention = uniqueRules([...reportRetention, ...(retentionRules ?? [])])
    .sort((a, b) => b.support - a.support)
    .slice(0, 5);
  const ceiling = 1 / Math.max(1 - report.dataset.churnRate, 0.0001);

  return (
    <div id="section-5-3" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-xl font-semibold">5.3 Association rules</h3>
      </div>
      <Takeaway>The strongest churn rules show combinations above the portfolio rate.</Takeaway>
      <ReportTable id="churn-rules" caption={`Top ${churn.length} churn rules by lift.`}>
        <RulesTable rules={churn} />
      </ReportTable>
      <ReportTable
        id="retention-rules"
        caption={`Top ${retention.length} retention rules by support.`}
      >
        <RulesTable rules={retention} />
      </ReportTable>
      <ReportDetails>
        <p>
          Apriori uses {report.methodology?.associationRules?.attributesUsed?.length ?? "reported"}{" "}
          attributes after{" "}
          {report.methodology?.associationRules?.discretization ?? "discretization"}. Churn ranks by
          lift. Retention ranks by support.
        </p>
        <p className="mt-2">
          Retention has a {formatPct(1 - report.dataset.churnRate)} base rate. Its lift ceiling is{" "}
          {ceiling.toFixed(2)}.
        </p>
      </ReportDetails>
    </div>
  );
}

export function AnomalySection({ report }: { report: MiningReport }) {
  const anomaly = report.methodology?.anomaly;
  const rows = report.anomalies.topAnomalies;
  return (
    <div id="section-5-4" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-xl font-semibold">5.4 Anomaly detection</h3>
      </div>
      <Takeaway>Combined checks isolate unusual customers for review.</Takeaway>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AnomalyMetric label="Phase-2 outliers" value={report.anomalies.phase2OutlierCount} />
        <AnomalyMetric
          label="Strong cluster outliers"
          value={report.anomalies.clusterStrongOutlierCount}
        />
        <AnomalyMetric
          label="Mild cluster outliers"
          value={report.anomalies.clusterMildOutlierCount}
        />
        <AnomalyMetric
          label="Combined anomalies"
          value={report.anomalies.combinedAnomalyCount ?? report.anomalies.dbAnomalyCount}
        />
      </div>
      <ReportDetails label="Show top anomalies" className="report-detail-print">
        <ReportTable
          id="anomalies"
          caption={`Highest-scoring ${rows.length} combined anomaly records.`}
        >
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-right">Score</th>
                <th className="p-3 text-right">Cluster</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientNum} className="border-b last:border-0">
                  <td className="p-3 font-mono">{row.clientNum}</td>
                  <td className="max-w-xl whitespace-normal break-words p-3">{row.reason}</td>
                  <td className="p-3 text-right tabular-nums">{row.score.toFixed(4)}</td>
                  <td className="p-3 text-right">
                    {row.clusterId == null ? "n/a" : `C${row.clusterId}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTable>
      </ReportDetails>
      <ReportDetails>
        <p>{report.anomalies.rule ?? anomaly?.rule ?? "The anomaly rule is not available."}</p>
        <p className="mt-2">
          Mean distance: {formatNumber(report.anomalies.clusterDistanceMu ?? anomaly?.mu)}. Standard
          deviation: {formatNumber(report.anomalies.clusterDistanceSigma ?? anomaly?.sigma)}. Mild
          threshold: {formatNumber(report.anomalies.mildThreshold ?? anomaly?.mildThreshold)}.
          Strong threshold:{" "}
          {formatNumber(report.anomalies.strongThreshold ?? anomaly?.strongThreshold)}.
        </p>
      </ReportDetails>
    </div>
  );
}

function RulesTable({ rules }: { rules: Rule[] }) {
  return (
    <table className="w-full min-w-[760px] text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="p-3 text-left">Antecedent</th>
          <th className="p-3 text-left">Consequence</th>
          <th className="p-3 text-right">Support</th>
          <th className="p-3 text-right">Confidence</th>
          <th className="p-3 text-right">Lift</th>
        </tr>
      </thead>
      <tbody>
        {rules.length ? (
          rules.map((rule) => (
            <tr key={rule.ruleId} className="border-b last:border-0">
              <td className="max-w-xl whitespace-normal break-words p-3" title={rule.lhs}>
                {formatRuleAntecedent(rule.lhs)}
              </td>
              <td className="whitespace-normal break-words p-3 font-medium" title={rule.rhs}>
                {formatRuleOutcome(rule.rhs)}
              </td>
              <td className="p-3 text-right tabular-nums">{formatPct(rule.support)}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(rule.confidence)}</td>
              <td className="p-3 text-right font-semibold tabular-nums">{rule.lift.toFixed(2)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="p-5 text-center text-muted-foreground">
              No rules returned for this category.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function AnomalyMetric({ label, value }: { label: string; value?: number | null }) {
  return (
    <Card className="break-inside-avoid">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {value == null ? "n/a" : formatInt(value)}
        </p>
      </CardContent>
    </Card>
  );
}

function formatNumber(value?: number | null): string {
  return value == null ? "n/a" : value.toFixed(4);
}

function uniqueRules(rules: Rule[]): Rule[] {
  return Array.from(new Map(rules.map((rule) => [rule.ruleId, rule])).values());
}
