"use client";

import { metricText } from "./report-copy";
import { formatCvF1Change, formatPct } from "@/lib/format";
import { useFacts } from "@/hooks/useFacts";
import type { MiningReport } from "@/types/api.types";
import { findBestVariant } from "./ExecutiveSummary";
import { parseSequenceArtifact } from "./sequence-data";
import { ReportSection } from "./ReportPrimitives";
import { modelLabel } from "./model-labels";

export function ConclusionsSection({ report, id = "section-9", title = "9 Conclusions" }: { report: MiningReport; id?: string; title?: string }) {
  const best = findBestVariant(report);
  const { getFact } = useFacts({ report });
  const latestRates = ["default-rate-pay1-late1", "default-rate-pay1-late2", "default-rate-pay1-late3plus"].map((factId) => getFact(factId).value);
  const delayerDefaults = getFact("share-of-defaults-delayers").value;
  const delayerClients = getFact("share-of-clients-delayers").value;
  const utilizationRates = ["default-rate-avg-utilization-le0", "default-rate-avg-utilization-gt0-le0-25", "default-rate-avg-utilization-gt1"].map((factId) => getFact(factId).value);
  const sequence = parseSequenceArtifact(report.sequences);
  const sequenceChanges = [
    sequenceChange(sequence?.featureExperiment.results, "RANDOMFOREST", "Random forest"),
    sequenceChange(sequence?.featureExperiment.results, "DECISIONTREE", "J48"),
  ];
  return (
    <ReportSection id={id} title={title} takeaway="The comparison selects a reproducible model and states the limits of the evidence.">
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>CreditMiner prepares the UCI data and combines classification, clustering, rules, anomalies, and sequence mining.</p>
        <p>{best ? `${modelLabel(best.algo, best.variant)} has CV F1 ${metricText(best.cv?.f1Default, 1)}, holdout F1 ${metricText(best.test?.f1Default, 1)}, and holdout ROC-AUC ${metricText(best.test?.rocAuc, 1)}.` : "The selected model metrics are unavailable."}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{latestRates.every((value) => value != null)
            ? `The latest-statement ladder rises from ${formatPct(latestRates[0])} default at 1 month late, to ${formatPct(latestRates[1])} at 2 months, and ${formatPct(latestRates[2])} at 3+ months.`
            : "The latest-statement ladder is unavailable until its facts load."}</li>
          <li>{delayerDefaults != null && delayerClients != null
            ? `Delaying personas account for ${formatPct(delayerDefaults)} of defaults while representing ${formatPct(delayerClients)} of clients.`
            : "The delaying-persona shares are unavailable until their facts load."}</li>
          <li>{utilizationRates.every((value) => value != null)
            ? `Utilization shows a U-shape: default is ${formatPct(utilizationRates[0])} with no positive utilization, ${formatPct(utilizationRates[1])} at more than 0% through 25%, and ${formatPct(utilizationRates[2])} above 100%.`
            : "The utilization U-shape is unavailable until its facts load."}</li>
          <li>Risk tier is derived from delay features and utilization; its importance is not independent evidence of a new risk driver.</li>
        </ul>
        <p>The clusters describe client groups. Apriori rules show co-occurring conditions. GSP shows ordered repayment and payment behavior.</p>
        {sequenceChanges.map(({ sentence }) => <p key={sentence}>{sentence}</p>)}
        {sequenceChanges.some(({ delta }) => delta != null) ? <p>Interpretation: We read this as the six monthly repayment-status inputs already carrying the history that the patterns summarise.</p> : null}
        <p>Next work should add out-of-time validation, threshold costs, calibration checks, and monitoring by monthly cohort.</p>
      </div>
    </ReportSection>
  );
}

function sequenceChange(
  rows: Array<{ algo: string; features: string; cv: { f1: number } }> | undefined,
  algorithm: string,
  displayName: string,
): { sentence: string; delta?: number } {
  const matches = (value: string) => value === algorithm || (algorithm === "DECISIONTREE" && value === "J48");
  const base = rows?.find((row) => matches(row.algo) && row.features === "base");
  const augmented = rows?.find((row) => matches(row.algo) && row.features === "base+seq");
  if (!base || !augmented) return { sentence: `The ${displayName} sequence-feature comparison is unavailable.` };
  const delta = augmented.cv.f1 - base.cv.f1;
  return { sentence: formatCvF1Change(delta, modelLabel(algorithm)), delta };
}
