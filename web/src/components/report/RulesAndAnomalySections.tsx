"use client";

import { Fragment } from "react";
import { useRuleFamilies } from "@/hooks/useRules";
import { rankRuleFamilies, RuleFootnote, upliftText } from "@/components/rules/RuleEvidence";
import type { RuleFamily } from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { shortRuleName } from "@/lib/rules-format";
import { formatInt, formatPct } from "@/lib/utils";
import type { MiningReport, Rule } from "@/types/api.types";
import { ReportDetails, ReportTable, Takeaway } from "./ReportPrimitives";

export function RulesSection({
  report,
}: {
  report: MiningReport;
  defaultRules?: Rule[];
  nonDefaultRules?: Rule[];
}) {
  const defaults = useRuleFamilies("default");
  const nonDefaults = useRuleFamilies("nonDefault");
  const ceiling = 1 / Math.max(1 - report.dataset.defaultRate, 0.0001);

  return (
    <div id="section-5-3-rules" className="scroll-mt-20 space-y-5">
      <div>
        <h4 className="report-heading text-lg font-semibold">Apriori association rules [8]</h4>
      </div>
      <Takeaway>The strongest default rules show combinations above the portfolio rate.</Takeaway>
      <ReportTable id="default-rules" caption="Default base conditions and their modifiers.">
        {defaults.isLoading ? (
          <p>Loading default families...</p>
        ) : defaults.error ? (
          <p>Default families unavailable.</p>
        ) : (
          <FamilyRulesTable families={defaults.data?.families ?? []} outcome="default" />
        )}
      </ReportTable>
      <ReportTable
        id="non-default-rules"
        caption="Non-default base conditions and their modifiers."
      >
        {nonDefaults.isLoading ? (
          <p>Loading non-default families...</p>
        ) : nonDefaults.error ? (
          <p>Non-default families unavailable.</p>
        ) : (
          <FamilyRulesTable families={nonDefaults.data?.families ?? []} outcome="non-default" />
        )}
      </ReportTable>
      <RuleFootnote methodology={report.methodology?.associationRules} />
      <ReportDetails>
        <p>
          The report contains {formatInt(report.summary?.defaultRuleCount ?? report.rules.defaultRules)} default rules and{" "}
          {formatInt(report.summary?.nonDefaultRuleCount ?? report.rules.nonDefaultRules)} non-default rules.
        </p>
        <p className="break-words">
          Apriori uses {report.methodology?.associationRules?.attributesUsed?.length ?? "reported"}{" "}
          attributes after{" "}
          {report.methodology?.associationRules?.discretization ?? "discretization"}. Families
          are ranked by lift over the portfolio rate, with modifiers shown below each base condition.
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
    <div id="section-5-3-anomalies" className="scroll-mt-20 space-y-5">
      <div>
        <h4 className="report-heading text-lg font-semibold">Anomaly detection</h4>
      </div>
      <Takeaway>Combined checks isolate unusual clients for review.</Takeaway>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AnomalyMetric
          label="Clients with any flagged column"
          value={report.anomalies.phase2OutlierCount}
        />
        <AnomalyMetric
          label="Far from centroid (> mu + 2 sigma)"
          value={report.anomalies.clusterStrongOutlierCount}
        />
        <AnomalyMetric
          label="Moderately far (> mu + 1 sigma)"
          value={report.anomalies.clusterMildOutlierCount}
        />
        <AnomalyMetric
          label="Anomalies (combined rule)"
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
                <th className="p-3 text-right">Persona</th>
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
                    {row.clusterId == null ? "n/a" : report.clustering.clusters.find((cluster) => cluster.clusterId === row.clusterId)?.displayName ?? `Persona ${row.clusterId}`}
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

export function FamilyRulesTable({ families, outcome = "default" }: { families: RuleFamily[]; outcome?: "default" | "non-default" }) {
  return (
    <table className="w-full min-w-[640px] text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="p-3 text-left">Condition</th>
          <th className="p-3 text-right">Confidence</th>
          <th className="p-3 text-right">Lift</th>
          <th className="p-3 text-right">Clients</th>
          <th className="p-3 text-right">{outcome === "default" ? "Defaults" : "Non-defaults"}</th>
          <th className="p-3 text-right">vs family</th>
        </tr>
      </thead>
      <tbody>
        {families.length ? (
          rankRuleFamilies(families).map((family) => (
            <Fragment key={family.familyId}>
              <tr className="border-b font-bold">
                <td className="p-3">
                  {family.baseRule ? shortRuleName(family.baseRule) : family.label}
                </td>
                <td className="p-3 text-right tabular-nums" title={!family.baseRule ? "not applicable" : undefined}>
                  {family.baseRule ? formatPct(family.baseRule.confidence) : "-"}
                </td>
                <td className="p-3 text-right tabular-nums" title={!family.baseRule ? "not applicable" : undefined}>
                  {family.baseRule ? family.baseRule.lift.toFixed(2) : "-"}
                </td>
                <td className="p-3 text-right tabular-nums" title={!family.baseRule ? "not applicable" : undefined}>
                  {family.baseRule?.lhsCount == null ? "-" : formatInt(family.baseRule.lhsCount)}
                </td>
                <td className="p-3 text-right tabular-nums" title={!family.baseRule ? "not applicable" : undefined}>
                  {!family.baseRule ? "-" : family.baseRule.jointCount == null
                    ? "-"
                    : formatInt(family.baseRule.jointCount)}
                </td>
                <td className="p-3 text-right">
                  {family.baseRule ? "Base" : "No standalone base"}
                </td>
              </tr>
              {family.modifiers.map((modifier) => (
                <tr key={modifier.ruleId} className="border-b last:border-0">
                  <td className="p-3 pl-7" title={modifier.conditionText}>
                    + {modifier.label}
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatPct(modifier.confidence)}</td>
                  <td className="p-3 text-right tabular-nums">{modifier.lift.toFixed(2)}</td>
                  <td className="p-3 text-right tabular-nums">{modifier.lhsCount == null ? "-" : formatInt(modifier.lhsCount)}</td>
                  <td className="p-3 text-right tabular-nums">{modifier.jointCount == null ? "-" : formatInt(modifier.jointCount)}</td>
                  <td className="p-3 text-right tabular-nums" title={!family.baseRule ? "not applicable" : undefined}>
                    {family.baseRule && modifier.upliftPp != null ? upliftText(modifier.upliftPp) : "-"}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))
        ) : (
          <tr>
            <td colSpan={6} className="p-5 text-center text-muted-foreground">
              No families returned for this category.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
