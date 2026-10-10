"use client";

import { useClusters } from "@/hooks/useClusters";
import { useRules } from "@/hooks/useRules";
import { useFacts } from "@/hooks/useFacts";
import { ClusterCard } from "../ClusteringSection";
import { RulesTable } from "../RulesAndAnomalySections";
import { formatInt, formatPct } from "@/lib/utils";
import type { MiningReport } from "@/types/api.types";
import { comparisonRows, ModelComparisonTable } from "../ClassificationSection";
import { ConclusionsSection } from "../ConclusionsSection";
import { EvaluationSection } from "../EvaluationSection";
import { findBestVariant } from "../ExecutiveSummary";
import { metricText } from "../report-copy";
import { IntroductionSection } from "../IntroductionSection";
import { PAPER_CAPTION_IDS } from "../caption-order";
import { ReferencesSection } from "../ReferencesSection";
import { CaptionRegistry, EmptyEvidence, ReportSection, ReportTable, usePrintExpandedDetails } from "../ReportPrimitives";
import { RunCommandsAppendix } from "../RunCommandsAppendix";
import { SequenceEvidence } from "../SequenceSection";
import { parseSequenceArtifact } from "../sequence-data";
import { TeamTable } from "../TeamTable";

const SEQUENCE_IDS = {
  mapping: "paper-sequence-mapping",
  supportFigure: "paper-sequence-support",
  nonDefault: "paper-sequence-non-default",
  experiment: "paper-sequence-experiment",
};

export function PaperReportDocument({ report }: { report: MiningReport }) {
  usePrintExpandedDetails();
  const { getFact } = useFacts({ report });
  const { data: enrichedClusters } = useClusters();
  const { data: enrichedRules } = useRules(1);
  const clusters = enrichedClusters ?? report.clustering.clusters;
  const rules = enrichedRules ?? report.rules.topRules;
  const best = findBestVariant(report);
  const sequence = parseSequenceArtifact(report.sequences);
  const preprocessing = report.methodology?.preprocessing;
  const split = report.classification.evaluation?.split ?? report.methodology?.split;
  const variants = report.classification.evaluation?.variants ?? [];
  const baselineVariants = variants.filter((variant) => variant.variant === "baseline");
  const classifiers = Array.from(new Set(variants.map((variant) => variant.algo).filter(Boolean)))
    .map((algo) => algo === "J48" ? "J48 C4.5 [5]" : algo === "RandomForest" ? "RandomForest [6]" : algo);
  const sourceRows = preprocessing?.rowsIn;
  const trainRatio = split?.trainRatio;
  const holdoutRatio = trainRatio == null ? null : 1 - trainRatio;
  const classifierCount = new Set(variants.map((variant) => variant.algo).filter(Boolean)).size;
  const selectionRule = report.classification.evaluation?.bestVariant?.selectionRule;
  const duplicatesDropped = preprocessing?.duplicatesDropped ?? 0;
  const negativeBillTotal = preprocessing?.negativeBillTotal ?? 0;
  const mappingRules = Object.entries(preprocessing?.categoryMappingRules ?? {});
  const mappingColumns = mappingRules.map(([name]) => name === "Default" ? "the target" : name);
  const undocumentedCounts = Object.values(preprocessing?.unknownRewritten ?? {});
  const undocumentedRewrites = undocumentedCounts.reduce((sum, count) => sum + count, 0);
  const iqrOutlierFlags = Object.values(preprocessing?.outlierByColumn ?? {}).reduce((sum, row) => sum + (row.iqrCount ?? 0), 0);
  const derivedFeatureCount = report.methodology?.featureEngineering?.derivedFeatures?.length ?? 0;
  const preparationSteps: string[] = [];
  if (mappingColumns.length > 0) {
    const columns = mappingColumns.length === 1 ? mappingColumns[0] : `${mappingColumns.slice(0, -1).join(", ")} and ${mappingColumns.at(-1)}`;
    preparationSteps.push(`maps the categorical codes of ${columns} to labels`);
  }
  if (undocumentedCounts.length > 0) preparationSteps.push(`rewrites ${formatInt(undocumentedRewrites)} undocumented codes to Other`);
  if (duplicatesDropped > 0) preparationSteps.push(`removes ${formatInt(duplicatesDropped)} duplicate rows`);
  if (iqrOutlierFlags > 0) preparationSteps.push(`records ${formatInt(iqrOutlierFlags)} per-column IQR outlier flags`);
  if (negativeBillTotal > 0) preparationSteps.push(`keeps ${formatInt(negativeBillTotal)} negative bill values`);
  if (derivedFeatureCount > 0) preparationSteps.push(`derives ${formatInt(derivedFeatureCount)} engineered features`);
  if (split?.strategy) preparationSteps.push(`creates the ${split.strategy} split${trainRatio == null || holdoutRatio == null ? "" : ` with ${formatPct(trainRatio, 0)} for training and ${formatPct(holdoutRatio, 0)} for holdout`}`);
  const preprocessingRows: Array<[string, string]> = [
    ["Rows in", intValue(preprocessing?.rowsIn)],
    ["Rows out", intValue(preprocessing?.rowsOut)],
    ["Duplicates removed", intValue(preprocessing?.duplicatesDropped)],
    ["Negative bills retained", intValue(preprocessing?.negativeBillTotal)],
    ["Split", split?.strategy ?? "n/a"],
  ];
  if (trainRatio != null && holdoutRatio != null) preprocessingRows.push(["Train / holdout", `${formatPct(trainRatio, 0)} / ${formatPct(holdoutRatio, 0)}`]);
  if (undocumentedCounts.length > 0) preprocessingRows.splice(2, 0, ["Undocumented codes rewritten to Other", formatInt(undocumentedRewrites)]);
  if (iqrOutlierFlags > 0) preprocessingRows.splice(-1, 0, ["IQR outlier flags", formatInt(iqrOutlierFlags)]);
  preprocessingRows.push(...mappingRules.map(([name, rule]): [string, string] => [`Mapping: ${name}`, rule]));
  return (
    <CaptionRegistry registry={PAPER_CAPTION_IDS}>
      <article className="paper-document report-document mx-auto w-full min-w-0 max-w-[190mm] space-y-10 bg-background text-foreground">
        <section className="paper-cover flex min-h-[245mm] flex-col justify-center space-y-8 text-center">
          <div><p className="text-sm uppercase tracking-[0.2em]">International University (VNU-HCM)</p><p className="mt-2">IT160IU Data Mining {"\u00b7"} Fall 2026</p></div>
          <div><h1 className="font-serif text-4xl font-bold leading-tight">CreditMiner: Predicting Credit-Card Default with Weka</h1><p className="mt-4 text-muted-foreground">Academic report</p></div>
          <TeamTable />
          <p className="text-sm">Build date: {formatDate(report.generatedAt)}</p>
        </section>

        <section className="paper-numbered-section space-y-4"><h2 className="font-serif text-2xl font-bold">Abstract</h2><p className="text-sm leading-7">CreditMiner predicts default payment next month for {sourceRows == null ? "credit-card clients" : `${formatInt(sourceRows)} credit-card clients`} in the UCI dataset 350. The data records client attributes and payment behavior from April to September 2005. The workflow {preparationSteps.length ? preparationSteps.join("; ") : "uses the recorded preprocessing steps"}. {classifierCount ? formatInt(classifierCount) : "The available"} Weka classifiers are compared with baseline, SMOTE, and cost-sensitive variants. Stratified {split?.cvFolds == null ? "cross-validation" : `${formatInt(split.cvFolds)}-fold cross-validation`} applies the selection rule: {selectionRule ?? "F1 for the default class first, ROC AUC as the tiebreaker"}. {best ? `${best.algo} (${best.variant}) reaches CV F1 ${metricText(best.cv?.f1Default, 2)}, holdout F1 ${metricText(best.test?.f1Default, 2)}, and holdout ROC-AUC ${metricText(best.test?.rocAuc, 2)}.` : "The selected-model metrics are unavailable."} K-means, Apriori, anomaly detection, and GSP add descriptive evidence. {sequence?.featureExperiment?.patternSelection ? "The sequence experiment selects patterns inside each CV fold to prevent leakage. " : ""}The report also records model build, cross-validation, and holdout prediction times. Results support model comparison, but they do not establish performance on a later time period.</p></section>

        <div className="paper-numbered-section"><IntroductionSection report={report} id="paper-introduction" title="1 Introduction" /></div>

        <ReportSection id="paper-dataset-section" title="2 Dataset" className="paper-numbered-section">
          <p className="text-sm leading-6 text-muted-foreground">The UCI Default of Credit Card Clients dataset describes clients in Taiwan [1, 2]. The target is default payment next month.</p>
          <ReportTable id="paper-dataset" caption="Dataset summary."><table className="w-full text-sm"><tbody>{[
            ["Source clients", sourceRows == null ? "n/a" : formatInt(sourceRows)], ["Prepared clients", formatInt(report.dataset.totalRows)], ["Columns", formatInt(report.dataset.totalColumns)], ["Default clients", formatInt(report.dataset.defaultCustomers)], ["Default rate", formatPct(report.dataset.defaultRate)], ["Period", "April-September 2005"],
          ].map(([label, value]) => <tr key={label} className="border-b last:border-0"><th className="p-2 text-left">{label}</th><td className="p-2 text-right">{value}</td></tr>)}</tbody></table></ReportTable>
        </ReportSection>

        <ReportSection id="paper-preprocessing-section" title="3 Preprocessing" className="paper-numbered-section">
          <p className="text-sm leading-6 text-muted-foreground">Phase 1 maps categorical codes and rewrites undocumented codes to Other. Phase 2 removes duplicate rows and records outlier flags while retaining flagged rows and negative bill values.</p>
          <p className="text-sm leading-6 text-muted-foreground">{preparationSteps.length ? `Step 1 ${preparationSteps.join("; ")}.` : "Step 1 has no recorded preprocessing actions."}</p>
          <ReportTable id="paper-preprocessing" caption="Step 1 preparation evidence."><table className="w-full text-sm"><tbody>{preprocessingRows.map(([label, cell]) => <tr key={label} className="border-b last:border-0"><th className="p-2 text-left">{label}</th><td className="p-2 text-right">{cell}</td></tr>)}</tbody></table></ReportTable>
        </ReportSection>

        <ReportSection id="paper-classification" title="4 Classification" className="paper-numbered-section">
          <p className="text-sm leading-6 text-muted-foreground">Step 2 writes the prepared train and test data as ARFF. Weka 3.8.6 runs {classifiers.length ? classifiers.join(", ") : "the configured classifiers"} through Java [3, 4].</p>
          <pre className="max-w-full overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs"><code>{`Instances train = DataSource.read(trainPath);\nClassifier model = new RandomForest();\nmodel.buildClassifier(train);`}</code></pre>
          <ReportTable id="paper-algorithms" caption="Classification algorithms and key parameters."><table className="w-full text-xs"><thead><tr className="border-b"><th className="p-2 text-left">Algorithm</th><th className="p-2 text-left">Method</th><th className="p-2 text-left">Parameters</th></tr></thead><tbody>{baselineVariants.map((variant) => {
            const parameters = variant.hyperparameters?.summary ?? variant.hyperparameters?.options ?? "n/a";
            return <tr key={`${variant.algo}-${variant.variant}`} className="border-b last:border-0"><td className="p-2">{variant.algo ?? "n/a"}</td><td className="p-2">{algorithmMethod(variant.algo)}</td><td className="p-2">{parameters}</td></tr>;
          })}</tbody></table></ReportTable>
        </ReportSection>

        <ReportSection id="paper-improvements" title="5 Improvements" className="paper-numbered-section">
          <div className="space-y-2 text-sm leading-6 text-muted-foreground"><p>Step 3 applies SMOTE only inside training folds [7]. Cost-sensitive models use the cost matrix recorded in each variant&apos;s API hyperparameters.</p><p>K-means segments clients [11]. Apriori extracts association rules [8]. GSP mines repayment sequences separately for both outcome groups [9, 12].</p></div>
          <section aria-label="Cluster profiles" className="space-y-3">
            <h3 className="report-heading text-lg font-semibold">Cluster profiles</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {clusters.map((cluster) => <ClusterCard key={cluster.clusterId} cluster={cluster}
                defaultRate={getFact(`default-rate-cluster-${cluster.clusterId}`).value ?? cluster.defaultRate}
                clientShare={getFact(`share-of-clients-cluster-${cluster.clusterId}`).value ?? cluster.shareOfClients ?? cluster.size / report.dataset.totalRows}
                defaultShare={getFact(`share-of-defaults-cluster-${cluster.clusterId}`).value ?? cluster.shareOfDefaults}
              />)}
            </div>
          </section>
          <section aria-label="Association rule evidence" className="min-w-0 space-y-3">
            <h3 className="report-heading text-lg font-semibold">Association rule evidence</h3>
            {(["default", "non-default"] as const).map((category) => <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium">{category === "default" ? "Default" : "Non-default"} families</h4>
              <div className="max-w-full overflow-x-auto rounded-lg border">
                <RulesTable rules={rules.filter((rule) => rule.category === category)} baseline={category === "default" ? report.dataset.defaultRate : 1 - report.dataset.defaultRate} />
              </div>
            </div>)}
          </section>
          {sequence ? <SequenceEvidence artifact={sequence} limit={8} ids={SEQUENCE_IDS} showRuntime={false} compact /> : <EmptyEvidence>The sequence-mining artifact is unavailable or invalid.</EmptyEvidence>}
        </ReportSection>

        <div className="paper-numbered-section"><EvaluationSection report={report} beforeRuntime={<><p className="text-sm leading-6 text-muted-foreground">Step 4 uses stratified {split?.cvFolds == null ? "CV" : `${formatInt(split.cvFolds)}-fold CV`} on the training split [10]. {holdoutRatio == null ? "The untouched holdout checks final metrics." : `The untouched ${formatPct(holdoutRatio, 0)} holdout checks final metrics.`} Selection rule: {selectionRule ?? "F1 for the default class first, ROC AUC as the tiebreaker"}.</p><ModelComparisonTable rows={comparisonRows(report)} best={best} appendix tableId="paper-model-comparison" /></>} ids={{ runtimeFigure: "paper-quality-runtime", runtimeTable: "paper-variant-runtime", roc: "paper-roc-curves", pr: "paper-pr-curves", best: "paper-best-confusion", others: "paper-other-confusions" }} /></div>

        <div className="paper-numbered-section"><ConclusionsSection report={report} id="paper-conclusions" title="7 Conclusions" /></div>
        <div className="paper-numbered-section"><ReferencesSection id="paper-references" /></div>
        <RunCommandsAppendix id="paper-commands" title="Appendix A Run commands" />
        <ReportSection id="paper-parameters-section" title="Appendix B Parameters" appendix>
          <ReportTable id="paper-parameters" caption="Classification parameters and timing fields." allowPageBreak><table className="w-full text-xs"><thead><tr className="border-b"><th className="p-2 text-left">Model</th><th className="p-2 text-left">Options</th><th className="p-2 text-right">Build</th><th className="p-2 text-right">Predict</th></tr></thead><tbody>{(report.classification.evaluation?.variants ?? []).map((row) => <tr key={`${row.algo}-${row.variant}`} className="border-b last:border-0"><td className="p-2">{row.algo} ({row.variant})</td><td className="p-2">{row.hyperparameters?.summary ?? row.hyperparameters?.options ?? "n/a"}</td><td className="p-2 text-right">{value(row.buildTimeMs ?? row.trainTimeMs)} ms</td><td className="p-2 text-right">{value(row.testPredictTimeMs)} ms</td></tr>)}</tbody></table></ReportTable>
        </ReportSection>
      </article>
    </CaptionRegistry>
  );
}

function value(input?: string | number | null): string { return input == null ? "n/a" : String(input); }
function intValue(input?: number | null): string { return input == null ? "n/a" : formatInt(input); }
function formatDate(input: string): string { const date = new Date(input); return Number.isNaN(date.valueOf()) ? input : new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(date); }
function algorithmMethod(algorithm?: string): string {
  const normalized = (algorithm ?? "").replaceAll(/[^a-z0-9]/gi, "").toUpperCase();
  if (normalized === "J48" || normalized === "DECISIONTREE") return "J48 / C4.5";
  if (normalized === "RANDOMFOREST") return "Random forest";
  if (normalized === "NAIVEBAYES") return "Naive Bayes";
  if (normalized === "LOGISTIC") return "Logistic regression";
  return algorithm ?? "n/a";
}
