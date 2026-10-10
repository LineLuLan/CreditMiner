"use client";

import { formatInt, formatPct } from "@/lib/utils";
import type { MiningReport } from "@/types/api.types";
import { ReportSection } from "./ReportPrimitives";

export function IntroductionSection({
  report,
  id = "section-1",
  title = "1 Introduction",
}: {
  report: MiningReport;
  id?: string;
  title?: string;
}) {
  const variants = report.classification.evaluation?.variants ?? [];
  const split = report.classification.evaluation?.split ?? report.methodology?.split;
  const sourceRows = report.methodology?.preprocessing?.rowsIn;
  const classifierCount = new Set(variants.map((variant) => variant.algo).filter(Boolean)).size;

  return (
    <ReportSection id={id} title={title} takeaway="CreditMiner predicts default payment next month and explains the evidence behind the result.">
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>The problem is to predict whether a credit-card client will default in the next month.</p>
        <p>
          The source UCI dataset 350 contains {sourceRows == null ? "clients" : `${formatInt(sourceRows)} clients`} from Taiwan. The prepared data contains {formatInt(report.dataset.totalRows)} rows.
          It covers April to September 2005. The default rate is {formatPct(report.dataset.defaultRate)} [1, 2].
        </p>
        <p>
          The workflow prepares the data and compares {classifierCount ? formatInt(classifierCount) : "the available"} Weka classifiers [3, 4]. It tests SMOTE [7], cost-sensitive learning,
          K-means [11], Apriori [8], and GSP sequence mining [9] with stratified {split?.cvFolds == null ? "cross-validation" : `${formatInt(split.cvFolds)}-fold cross-validation`} [10].
        </p>
        <p>The report makes four contributions:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground">
          <li>It compares {variants.length ? formatInt(variants.length) : "the available"} classification variants with the same split.</li>
          <li>It reports holdout quality, build time, CV time, and prediction time.</li>
          <li>It links model results to clusters, rules, anomalies, and sequences.</li>
          <li>It provides repeatable CLI commands and parameters.</li>
        </ul>
      </div>
    </ReportSection>
  );
}
