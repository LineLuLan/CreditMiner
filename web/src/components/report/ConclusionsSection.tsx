"use client";

import { metricText } from "./report-copy";
import type { MiningReport } from "@/types/api.types";
import { findBestVariant } from "./ExecutiveSummary";
import { parseSequenceArtifact } from "./sequence-data";
import { ReportSection } from "./ReportPrimitives";

export function ConclusionsSection({ report, id = "section-9", title = "9 Conclusions" }: { report: MiningReport; id?: string; title?: string }) {
  const best = findBestVariant(report);
  const sequence = parseSequenceArtifact(report.sequences);
  const sequenceChanges = [
    sequenceChange(sequence?.featureExperiment.results, "RANDOMFOREST", "RandomForest"),
    sequenceChange(sequence?.featureExperiment.results, "DECISIONTREE", "J48"),
  ];
  return (
    <ReportSection id={id} title={title} takeaway="The comparison selects a reproducible model and states the limits of the evidence.">
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>CreditMiner prepares the UCI data and combines classification, clustering, rules, anomalies, and sequence mining.</p>
        <p>{best ? `${best.algo} (${best.variant}) has CV F1 ${metricText(best.cv?.f1Default, 2)}, holdout F1 ${metricText(best.test?.f1Default, 2)}, and holdout ROC-AUC ${metricText(best.test?.rocAuc, 2)}.` : "The selected model metrics are unavailable."}</p>
        <p>The clusters describe client groups. Apriori rules show co-occurring conditions. GSP shows ordered repayment and payment behavior.</p>
        {sequenceChanges.map(({ sentence }) => <p key={sentence}>{sentence}</p>)}
        {sequenceChanges.some(({ delta }) => delta != null) ? <p>Interpretation: We read this as the six PAY_x inputs already carrying the monthly history that the patterns summarise.</p> : null}
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
  const signedDelta = `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`;
  return { sentence: `Adding sequence features changes ${displayName} CV F1 by${Math.abs(delta) < 0.01 ? " only" : ""} ${signedDelta}.`, delta };
}
