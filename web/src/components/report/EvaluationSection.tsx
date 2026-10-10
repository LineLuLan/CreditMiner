"use client";

import { ConfusionMatrix } from "@/components/charts/ConfusionMatrix";
import { PrCurveChart } from "@/components/charts/PrCurveChart";
import { RocCurveChart } from "@/components/charts/RocCurveChart";
import { Card, CardContent } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import type { ReactNode } from "react";
import type { MiningReport } from "@/types/api.types";
import { findBestVariant, modelDeploymentStatement } from "./ExecutiveSummary";
import { EmptyEvidence, ReportDetails, ReportFigure, ReportSection } from "./ReportPrimitives";
import { FeatureImportanceEvidence } from "./FeatureImportanceEvidence";
import { RuntimeAnalysis } from "./RuntimeChart";

export function EvaluationSection({
  report,
  beforeRuntime,
  compactRuntime = false,
  ids = {
    runtimeFigure: "quality-runtime",
    runtimeTable: "variant-runtime",
    roc: "roc-curves",
    pr: "pr-curves",
    best: "best-confusion",
    others: "other-confusions",
  },
}: {
  report: MiningReport;
  beforeRuntime?: ReactNode;
  compactRuntime?: boolean;
  ids?: { runtimeFigure: string; runtimeTable: string; roc: string; pr: string; best: string; others: string };
}) {
  const variants = report.classification.evaluation?.variants ?? [];
  const canonical = variants.filter((variant) => variant.isCanonical);
  const best = findBestVariant(report);
  const matrix = best?.test?.confusionMatrix;
  const others = variants.filter((variant) => variant !== best);
  const split = report.classification.evaluation?.split ?? report.methodology?.split;
  const testRows = split?.testRows;
  const prevalence = report.dataset.defaultRate;
  const selectionRule = report.classification.evaluation?.bestVariant?.selectionRule;

  return (
    <ReportSection
      id="section-6"
      title="6 Evaluation"
      takeaway={`Selection rule: ${selectionRule ?? "F1 for the default class first, ROC AUC as the tiebreaker"}.`}
    >
      <Card className="break-inside-avoid border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm font-medium leading-6">
          {modelDeploymentStatement(report)}
        </CardContent>
      </Card>

      <FeatureImportanceEvidence report={report} />

      {beforeRuntime}

      <RuntimeAnalysis variants={variants} best={best} figureId={ids.runtimeFigure} tableId={ids.runtimeTable} compact={compactRuntime} cvFolds={split?.cvFolds} />

      <div className="report-chart-grid grid gap-5 xl:grid-cols-2">
        <ReportFigure
          id={ids.roc}
          caption={`ROC curves for ${canonical.length} canonical algorithms on the held-out test set${testRows ? ` (n = ${formatInt(testRows)})` : ""}.`}
        >
          {canonical.length ? (
            <RocCurveChart variants={canonical} />
          ) : (
            <EmptyEvidence>Canonical ROC curves are unavailable.</EmptyEvidence>
          )}
        </ReportFigure>
        <ReportFigure
          id={ids.pr}
          caption={`Precision-recall curves with the ${formatPct(prevalence)} minority-class prevalence baseline.`}
        >
          {canonical.length ? (
            <PrCurveChart variants={canonical} prevalence={prevalence} />
          ) : (
            <EmptyEvidence>Canonical precision-recall curves are unavailable.</EmptyEvidence>
          )}
        </ReportFigure>
      </div>

      <ReportDetails className="report-detail-print">
        <p>
          Default is {formatPct(prevalence)} of the data. F1 balances precision and recall. PR-AUC
          measures retrieval for the default class.
        </p>
      </ReportDetails>

      <ReportFigure
        id={ids.best}
        caption={`Confusion matrix for the selected ${best?.algo ?? "best model"} (${best?.variant ?? "variant"}) on the held-out test set.`}
      >
        <Card className="break-inside-avoid">
          <CardContent className="mx-auto max-w-2xl p-5">
            <ConfusionMatrix labels={matrix?.labels} matrix={matrix?.matrix} />
          </CardContent>
        </Card>
      </ReportFigure>

      <ReportFigure
        id={ids.others}
        caption={`Confusion matrices for the other ${others.length} evaluated variants.`}
      >
        <details className="report-details-visual rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Show other model matrices</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {others.map((variant) => (
              <ConfusionMatrix
                key={`${variant.algo}-${variant.variant}`}
                title={`${variant.algo ?? "Model"} (${variant.variant ?? "variant"})`}
                labels={variant.test?.confusionMatrix?.labels}
                matrix={variant.test?.confusionMatrix?.matrix}
                compact
              />
            ))}
          </div>
        </details>
      </ReportFigure>
    </ReportSection>
  );
}
