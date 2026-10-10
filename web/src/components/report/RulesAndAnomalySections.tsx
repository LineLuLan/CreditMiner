"use client";

import { Card, CardContent } from "@/components/ui/card";
import { conditionText, formatRuleOutcome, ruleConditions, ruleFamilyLabel, shortRuleName } from "@/lib/rules-format";
import { formatInt, formatPct } from "@/lib/utils";
import type { MiningReport, Rule } from "@/types/api.types";
import { ReportDetails, ReportTable, Takeaway } from "./ReportPrimitives";

export function RulesSection({
  report,
  defaultRules,
  nonDefaultRules,
}: {
  report: MiningReport;
  defaultRules?: Rule[];
  nonDefaultRules?: Rule[];
}) {
  const reportDefault = report.rules.topRules.filter((rule) => rule.category === "default");
  const reportNonDefault = report.rules.topRules.filter((rule) => rule.category === "non-default");
  const defaults = uniqueRules([...reportDefault, ...(defaultRules ?? [])])
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 10);
  const nonDefaults = uniqueRules([...reportNonDefault, ...(nonDefaultRules ?? [])])
    .sort((a, b) => b.support - a.support)
    .slice(0, 5);
  const ceiling = 1 / Math.max(1 - report.dataset.defaultRate, 0.0001);

  return (
    <div id="section-5-2-rules" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-lg font-semibold">Apriori association rules [8]</h3>
      </div>
      <Takeaway>The strongest default rules show combinations above the portfolio rate.</Takeaway>
      <ReportTable id="default-rules" caption={`Top ${defaults.length} default rules by lift.`}>
        <RulesTable rules={defaults} baseline={report.dataset.defaultRate} />
      </ReportTable>
      <ReportTable
        id="non-default-rules"
        caption={`Top ${nonDefaults.length} non-default rules by support.`}
      >
        <RulesTable rules={nonDefaults} baseline={1 - report.dataset.defaultRate} />
      </ReportTable>
      <ReportDetails>
        <p>
          The report contains {formatInt(report.rules.defaultRules)} default rules and{" "}
          {formatInt(report.rules.nonDefaultRules)} non-default rules.
        </p>
        <p className="break-words">
          Apriori uses {report.methodology?.associationRules?.attributesUsed?.length ?? "reported"}{" "}
          attributes after{" "}
          {report.methodology?.associationRules?.discretization ?? "discretization"}. Default rules
          rank by lift. Non-default rules rank by support.
        </p>
        <p className="mt-2">
          Non-default has a {formatPct(1 - report.dataset.defaultRate)} base rate. Its lift ceiling
          is {ceiling.toFixed(2)}.
        </p>
      </ReportDetails>
    </div>
  );
}

export function AnomalySection({ report }: { report: MiningReport }) {
  const anomaly = report.methodology?.anomaly;
  const rows = report.anomalies.topAnomalies;
  return (
    <div id="section-5-2-anomalies" className="scroll-mt-20 space-y-5">
      <div>
        <h3 className="report-heading text-lg font-semibold">Anomaly detection</h3>
      </div>
      <Takeaway>Combined checks isolate unusual clients for review.</Takeaway>
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
          caption={`${rows.length} combined anomalies with the largest cluster-centroid distance.`}
        >
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-right">Centroid distance</th>
                <th className="p-3 text-right">Cluster</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientId} className="border-b last:border-0">
                  <td className="p-3 font-mono">{row.clientId}</td>
                  <td className="max-w-xl whitespace-normal break-words p-3">{row.reason}</td>
                  <td className="p-3 text-right tabular-nums">
                    {row.score == null ? "n/a" : row.score.toFixed(4)}
                  </td>
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

export function RulesTable({ rules, baseline }: { rules: Rule[]; baseline: number }) {
  return (
    <table className="w-full min-w-[760px] text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="p-3 text-left">Rule / conditions</th>
          <th className="p-3 text-left">Consequence</th>
          <th className="p-3 text-right">Support</th>
          <th className="p-3 text-right">Confidence</th>
          <th className="p-3 text-right">Baseline</th>
          <th className="p-3 text-right">Joint count</th>
          <th className="p-3 text-right">Lift</th>
        </tr>
      </thead>
      <tbody>
        {rules.length ? (
          rules.map((rule) => (
            <tr key={rule.ruleId} className="border-b last:border-0">
              <td className="max-w-xl whitespace-normal break-words p-3" title={rule.lhs}>
                <p className="font-semibold">{shortRuleName(rule)}</p>
                <p className="mt-1 text-muted-foreground">Family: {ruleFamilyLabel(rule)}</p>
                <ul className="mt-1 space-y-1">
                  {ruleConditions(rule).map((condition, index) => <li key={index}>{conditionText(condition)}</li>)}
                </ul>
              </td>
              <td className="whitespace-normal break-words p-3 font-medium" title={rule.rhs}>
                {formatRuleOutcome(rule.rhs)}
              </td>
              <td className="p-3 text-right tabular-nums">{formatPct(rule.support)}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(rule.confidence)}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(rule.baseline ?? baseline)}</td>
              <td className="p-3 text-right tabular-nums">{rule.jointCount == null ? "n/a" : formatInt(rule.jointCount)}</td>
              <td className="p-3 text-right font-semibold tabular-nums">{rule.lift.toFixed(2)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={7} className="p-5 text-center text-muted-foreground">
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
