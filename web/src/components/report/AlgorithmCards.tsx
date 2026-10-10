"use client";

import { ConfusionMatrix } from "@/components/charts/ConfusionMatrix";
import { Card, CardContent } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { EvaluationVariant, MiningReport } from "@/types/api.types";
import { EmptyEvidence, ReportDetails, ReportFigure, ReportTable } from "./ReportPrimitives";
import { metricText } from "./report-copy";

const ALGORITHMS = ["DECISIONTREE", "RANDOMFOREST", "NAIVEBAYES", "LOGISTIC"] as const;

const COPY: Record<(typeof ALGORITHMS)[number], { name: string; method: string }> = {
  DECISIONTREE: {
    name: "Decision tree",
    method: "Weka J48 builds a C4.5 decision tree [5]. It selects splits that separate the classes and prunes weak branches.",
  },
  RANDOMFOREST: {
    name: "Random forest",
    method: "Random forest combines many randomized decision trees [6]. It averages their votes to reduce variance.",
  },
  NAIVEBAYES: {
    name: "Naive Bayes",
    method: "Naive Bayes estimates class probabilities from each feature. It assumes that features are conditionally independent.",
  },
  LOGISTIC: {
    name: "Logistic regression",
    method: "Weka Logistic estimates a linear log-odds model. It converts the score to a default probability.",
  },
};

export function AlgorithmCards({ report }: { report: MiningReport }) {
  const variants = report.classification.evaluation?.variants ?? [];
  const split = report.classification.evaluation?.split ?? report.methodology?.split;
  return (
    <div id="section-5-1" className="scroll-mt-20 space-y-5">
      <h3 className="report-heading text-xl font-semibold">5.1 Algorithms</h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Each card compares the variants of one classifier. CV metrics use the default class
        {split?.trainRatio == null ? " and the training split." : ` and the ${formatPct(split.trainRatio)} training split.`}
      </p>
      <div className="space-y-6">
        {ALGORITHMS.map((algorithm) => (
          <AlgorithmCard key={algorithm} algorithm={algorithm} variants={variants.filter((row) => normalizeAlgorithm(row.algo) === algorithm)} />
        ))}
      </div>
    </div>
  );
}

function normalizeAlgorithm(value?: string): string {
  const normalized = (value ?? "").replaceAll(/[^a-z0-9]/gi, "").toUpperCase();
  return normalized === "J48" ? "DECISIONTREE" : normalized;
}

function AlgorithmCard({ algorithm, variants }: { algorithm: (typeof ALGORITHMS)[number]; variants: EvaluationVariant[] }) {
  const best = variants.slice().sort((a, b) => (b.cv?.f1Default ?? -1) - (a.cv?.f1Default ?? -1))[0];
  const baseline = variants.find((row) => row.variant === "baseline");
  const copy = COPY[algorithm];
  const slug = algorithm.toLowerCase();
  return (
    <Card className="break-inside-avoid">
      <CardContent className="space-y-4 p-5">
        <div>
          <h4 className="font-semibold">{copy.name}</h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.method}</p>
          <p className="mt-1 text-xs font-medium">
            {baseline?.hyperparameters?.summary ?? baseline?.hyperparameters?.options ?? "n/a"}
          </p>
        </div>
        {variants.length ? (
          <>
          <p className="text-sm font-medium">{remark(best, baseline)}</p>
          <ReportDetails label="Variant metrics and confusion matrix" className="report-detail-print">
            <ReportTable id={`algorithm-${slug}-variants`} caption={`${copy.name} variants and run times.`} allowPageBreak>
              <table className="w-full min-w-[1080px] text-[11px]">
                <thead><tr className="border-b bg-muted/30">
                  {[
                    "Variant", "CV accuracy", "CV precision", "CV recall", "CV F1", "CV ROC-AUC",
                    "Holdout F1", "Holdout ROC-AUC", "Build", "CV time", "Predict", "Microseconds / row",
                  ].map((label) => <th key={label} className="p-2 text-left">{label}</th>)}
                </tr></thead>
                <tbody>{variants.map((row) => <tr key={row.variant} className="border-b last:border-0">
                  <td className="p-2 font-medium">{row.variant ?? "n/a"}</td>
                  <MetricCell value={row.cv?.accuracy} /><MetricCell value={row.cv?.precisionDefault} />
                  <MetricCell value={row.cv?.recallDefault} /><MetricCell value={row.cv?.f1Default} />
                  <MetricCell value={row.cv?.rocAuc} /><MetricCell value={row.test?.f1Default} />
                  <MetricCell value={row.test?.rocAuc} />
                  <td className="p-2 text-right tabular-nums">{ms(row.buildTimeMs ?? row.trainTimeMs)}</td>
                  <td className="p-2 text-right tabular-nums">{ms(row.cvTimeMs)}</td>
                  <td className="p-2 text-right tabular-nums">{ms(row.testPredictTimeMs)}</td>
                  <td className="p-2 text-right tabular-nums">{row.predictMicrosPerRecord == null ? "n/a" : row.predictMicrosPerRecord.toFixed(2)}</td>
                </tr>)}</tbody>
              </table>
            </ReportTable>
            <ReportFigure id={`algorithm-${slug}-confusion`} caption={`${copy.name} confusion matrix for its best CV-F1 variant (${best?.variant ?? "n/a"}).`}>
              <div className="mx-auto max-w-xl rounded-lg border p-4">
                <ConfusionMatrix labels={best?.test?.confusionMatrix?.labels} matrix={best?.test?.confusionMatrix?.matrix} compact />
              </div>
            </ReportFigure>
          </ReportDetails>
          </>
        ) : <EmptyEvidence>No variants are available for {copy.name}.</EmptyEvidence>}
      </CardContent>
    </Card>
  );
}

function MetricCell({ value }: { value?: number | null }) {
  return <td className="p-2 text-right tabular-nums">{value == null ? "n/a" : formatPct(value, 2)}</td>;
}

function ms(value?: number | null): string { return value == null ? "n/a" : `${formatInt(value)} ms`; }

function remark(best?: EvaluationVariant, baseline?: EvaluationVariant): string {
  if (!best) return "No numeric comparison is available.";
  if (!baseline || best === baseline) return `The baseline has the highest CV F1 at ${metricText(best.cv?.f1Default, 2)}.`;
  if (best.cv?.recallDefault == null || baseline.cv?.recallDefault == null) return `${best.variant ?? "The best variant"} has the highest CV F1; the CV recall comparison is unavailable.`;
  const delta = best.cv.recallDefault - baseline.cv.recallDefault;
  return `${best.variant ?? "The best variant"} changes CV recall by ${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(2)} percentage points versus baseline.`;
}
