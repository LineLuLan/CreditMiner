"use client";

import { InsightVisualCard } from "@/components/insights/InsightVisualCard";
import { Card, CardContent } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { InsightVisual, MiningReport } from "@/types/api.types";
import { comparisonRows, ModelComparisonTable } from "./ClassificationSection";
import { findBestVariant } from "./ExecutiveSummary";
import { imputationSentence } from "./report-copy";
import { ReportDetails, ReportSection, ReportTable } from "./ReportPrimitives";

export function InsightsSection({
  report,
  visuals,
}: {
  report: MiningReport;
  visuals?: InsightVisual[];
}) {
  const visualsByTitle = new Map((visuals ?? []).map((visual) => [visual.title, visual]));
  return (
    <ReportSection
      id="section-7"
      title="7 Insights and recommendations"
      takeaway="Behavior signals show where default risk increases and which clients need review."
    >
      <ReportDetails label="Show insight evidence" className="report-detail-print">
        <div className="report-insight-grid grid gap-4 lg:grid-cols-2">
          {report.insights.map((insight) => (
            <InsightVisualCard
              key={insight.insightId}
              insight={insight}
              visual={visualsByTitle.get(insight.title)}
              className="report-insight-source"
            />
          ))}
        </div>
      </ReportDetails>
    </ReportSection>
  );
}

export function LimitationsSection({ report }: { report: MiningReport }) {
  const limitations = [
    "The evidence comes from one dataset snapshot. It does not represent changing client behavior.",
    "There is no temporal or out-of-time validation; the stratified holdout measures same-period generalization only.",
    "Feature importance is global and does not explain an individual prediction.",
    `Default is imbalanced at ${formatPct(report.dataset.defaultRate)}. Threshold and class-cost choices change results.`,
    "Non-default rules inherit a high majority-class base rate. This produces flat confidence and a low lift ceiling.",
  ];
  const nextSteps = [
    "Add an out-of-time test set and monitor F1, PR-AUC, recall, and calibration by monthly cohort.",
    "Evaluate operating thresholds with explicit false-negative and false-positive business costs.",
    "Add local explanation methods for reviewed clients while retaining the global comparison.",
    "Validate risk interventions with controlled experiments and segment-level uplift metrics.",
  ];
  return (
    <ReportSection
      id="section-8"
      title="8 Limitations and next steps"
      takeaway="One data snapshot cannot prove future performance or intervention effects."
    >
      <ListCard title="Key limitations" items={limitations.slice(0, 4)} />
      <ReportDetails>
        <ListCard title="Other limitation" items={limitations.slice(4)} flat />
        <ListCard title="Next steps" items={nextSteps} flat />
        <p className="mt-3">
          Keep the current model artifact. Restore it if default-class metrics or error cost
          decrease.
        </p>
      </ReportDetails>
    </ReportSection>
  );
}

export function Appendices({ report }: { report: MiningReport }) {
  const best = findBestVariant(report);
  const rows = comparisonRows(report);
  const parameters = parameterRows(report);
  return (
    <>
      <ReportSection
        id="appendix-a"
        title="Appendix A Model comparison"
        takeaway="The complete table supports review of every model metric."
        appendix
        className="report-print-only hidden print:block"
      >
        <ModelComparisonTable rows={rows} best={best} appendix />
      </ReportSection>
      <ReportSection
        id="appendix-b"
        title="Appendix B Parameters"
        takeaway="These values make the analysis repeatable."
      >
        <ReportDetails label="Show all parameters" className="report-detail-print">
        <ReportTable id="appendix-parameters" caption="Pipeline parameters." allowPageBreak>
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Parameter</th>
                <th className="p-3 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((row, index) => (
                <tr key={`${row[0]}-${row[1]}-${index}`} className="border-b last:border-0">
                  <td className="p-3 font-medium">{row[0]}</td>
                  <td className="p-3">{row[1]}</td>
                  <td className="max-w-2xl whitespace-normal break-words p-3 font-mono">
                    {row[2]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTable>
        </ReportDetails>
      </ReportSection>
      <EvidenceNotesAppendix report={report} />
    </>
  );
}

function EvidenceNotesAppendix({ report }: { report: MiningReport }) {
  const notes = [
    "Groups with fewer than 100 clients can change sharply. Read their rates with care.",
    `Unknown categories get explicit labels. ${imputationSentence(report.methodology?.preprocessing)} Outliers stay in the data.`,
    "SMOTE changes training rows only. Cost-sensitive models increase the penalty for missed defaults.",
    "F1 balances precision and recall. PR-AUC measures retrieval for the default class.",
    `Non-default has a ${formatPct(1 - report.dataset.defaultRate)} base rate. Its lift ceiling is ${(1 / Math.max(1 - report.dataset.defaultRate, 0.0001)).toFixed(2)}.`,
  ];
  return (
    <ReportSection
      id="appendix-c"
      title="Appendix C Evidence notes"
      takeaway="Open these notes to review detailed evidence and reading guidance."
    >
      <details className="report-evidence-notes rounded-lg border bg-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Evidence notes
        </summary>
        <div className="report-evidence-body space-y-5 border-t p-4">
          <section className="break-inside-avoid">
            <h3 className="report-heading font-semibold">Reading notes</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
          {report.insights.map((insight) => (
            <section key={insight.insightId} className="break-inside-avoid rounded-lg border p-4">
              <h3 className="report-heading font-semibold">{insight.title}</h3>
              <Evidence label="Discovery" text={insight.discovery} />
              <Evidence label="Evidence" text={insight.evidence} />
              <Evidence label="Recommendation" text={insight.recommendation} />
            </section>
          ))}
        </div>
      </details>
    </ReportSection>
  );
}

function parameterRows(report: MiningReport): string[][] {
  const evaluation = report.classification.evaluation;
  const split = evaluation?.split ?? report.methodology?.split;
  const cluster = report.methodology?.clustering;
  const rules = report.methodology?.associationRules;
  const anomaly = report.methodology?.anomaly;
  const rows: string[][] = [
    ["Classification", "Split", split?.strategy ?? "n/a"],
    [
      "Classification",
      "Train ratio",
      split?.trainRatio == null ? "n/a" : formatPct(split.trainRatio),
    ],
    ["Classification", "Seed / folds", `${value(split?.seed)} / ${value(split?.cvFolds)}`],
    [
      "Classification",
      "Train / test / SMOTE rows",
      `${value(split?.trainRows)} / ${value(split?.testRows)} / ${value(split?.smoteTrainRows)}`,
    ],
  ];
  for (const variant of evaluation?.variants ?? []) {
    rows.push([
      `${variant.algo ?? "Model"} (${variant.variant ?? "variant"})`,
      "Hyperparameters",
      variant.hyperparameters?.summary ?? variant.hyperparameters?.options ?? "n/a",
    ]);
    rows.push([
      `${variant.algo ?? "Model"} (${variant.variant ?? "variant"})`,
      "Build / CV / holdout prediction (ms)",
      `${value(variant.buildTimeMs ?? variant.trainTimeMs)} / ${value(variant.cvTimeMs)} / ${value(variant.testPredictTimeMs)}`,
    ]);
    rows.push([
      `${variant.algo ?? "Model"} (${variant.variant ?? "variant"})`,
      "Holdout rows / prediction (microseconds per record)",
      `${value(variant.testRows)} / ${value(variant.predictMicrosPerRecord)}`,
    ]);
  }
  rows.push(
    [
      "Clustering",
      "k range / chosen k",
      `${value(cluster?.kMin)}-${value(cluster?.kMax)} / ${value(cluster?.bestK ?? report.clustering.bestK)}`,
    ],
    [
      "Clustering",
      "Selection / normalization",
      `${cluster?.strategy ?? report.clustering.strategy}; ${cluster?.normalization ?? "n/a"}`,
    ],
    [
      "Clustering",
      "Seed / max iterations",
      `${value(cluster?.seed)} / ${value(cluster?.maxIterations)}`,
    ],
    ["Clustering", "Features", (cluster?.featuresUsed ?? []).join(", ") || "n/a"],
    ["Association rules", "Discretization", rules?.discretization ?? "n/a"],
    [
      "Association rules",
      "Attributes",
      `${formatInt(rules?.attributesUsed?.length ?? 0)}: ${(rules?.attributesUsed ?? []).join(", ") || "n/a"}`,
    ],
    [
      "Non-default Apriori",
      "Support / confidence / lift",
      `${value(rules?.nonDefaultPass?.minSupport)} / ${value(rules?.nonDefaultPass?.minConfidence)} / ${value(rules?.nonDefaultPass?.minLift)}`,
    ],
    [
      "Default Apriori",
      "Support / lift / metric",
      `${value(rules?.defaultPass?.minSupport)} / ${value(rules?.defaultPass?.minLift)} / ${rules?.defaultPass?.metric ?? "n/a"}`,
    ],
    [
      "Default Apriori",
      "Attempted support / final support",
      `${rules?.defaultPass?.attemptedSupports?.map(String).join(", ") || "n/a"} / ${value(rules?.defaultPass?.finalSupport)}`,
    ],
    ["Anomaly", "Rule", anomaly?.rule ?? report.anomalies.rule ?? "n/a"],
    [
      "Anomaly",
      "Mean / std / thresholds",
      `${value(anomaly?.mu)} / ${value(anomaly?.sigma)} / ${value(anomaly?.mildThreshold)} / ${value(anomaly?.strongThreshold)}`,
    ],
  );
  return rows;
}

function value(input: string | number | null | undefined): string {
  return input == null ? "n/a" : String(input);
}

function Evidence({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-6">{text}</p>
    </div>
  );
}

function ListCard({
  title,
  items,
  flat = false,
}: {
  title: string;
  items: string[];
  flat?: boolean;
}) {
  const content = (
    <>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
  return flat ? (
    <div className="mt-4">{content}</div>
  ) : (
    <Card className="break-inside-avoid">
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  );
}
