"use client";

import { useClusters } from "@/hooks/useClusters";
import { useRuleFamilies } from "@/hooks/useRules";
import { useFacts } from "@/hooks/useFacts";
import { useInsightVisuals } from "@/hooks/useInsights";
import { modelLabel } from "../model-labels";
import { InsightsSection } from "../InsightsAndAppendices";
import { ClusterCard, centroidLabel, formatCentroid } from "../ClusteringSection";
import { FamilyRulesTable } from "../RulesAndAnomalySections";
import { sortPersonas, lowestRiskPersonaId } from "@/components/clusters/clusters-view";
import { formatDecimal } from "@/lib/format";
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
  const { data: insightVisuals } = useInsightVisuals();
  const { data: enrichedClusters } = useClusters();
  const defaultFamilies = useRuleFamilies("default");
  const nonDefaultFamilies = useRuleFamilies("nonDefault");
  const clusters = sortPersonas(enrichedClusters ?? report.clustering.clusters, report.dataset.defaultRate);
  const lowestId = lowestRiskPersonaId(clusters, report.dataset.defaultRate);
  const clusterSelection = report.clustering.selection;
  const chosenK = clusterSelection?.chosenK ?? report.clustering.bestK;
  const silhouette = clusterSelection?.finalSilhouette ?? clusters[0]?.evidence?.silhouette;
  const kTwo = report.clustering.elbowScores.find((score) => score.k === 2);
  const centroidFeatures = Array.from(new Set(clusters.flatMap((cluster) => Object.keys(cluster.centroid))));
  const best = findBestVariant(report);
  const sequence = parseSequenceArtifact(report.sequences);
  const preprocessing = report.methodology?.preprocessing;
  const split = report.classification.evaluation?.split ?? report.methodology?.split;
  const variants = report.classification.evaluation?.variants ?? [];
  const baselineVariants = variants.filter((variant) => variant.variant === "baseline");
  const classifiers = Array.from(new Set(variants.map((variant) => variant.algo).filter(Boolean)))
    .map((algo) => modelLabel(algo));
  const sourceRows = preprocessing?.rowsIn;
  const trainRatio = split?.trainRatio;
  const holdoutRatio = trainRatio == null ? null : 1 - trainRatio;
  const classifierCount = new Set(variants.map((variant) => variant.algo).filter(Boolean)).size;
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
        <style>{`@media print {
          .paper-document details { display: block !important; }
          .paper-document details > summary { display: none !important; }
          .paper-document details > :not(summary) { display: block !important; }
          .paper-document th, .paper-document td { overflow-wrap: anywhere; }
        }`}</style>
        <section className="paper-cover flex min-h-[245mm] flex-col justify-center space-y-8 text-center">
          <div><p className="text-sm uppercase tracking-[0.2em]">International University (VNU-HCM)</p><p className="mt-2">IT160IU Data Mining {"\u00b7"} Fall 2026</p></div>
          <div><h1 className="font-serif text-4xl font-bold leading-tight">CreditMiner: Predicting Credit-Card Default with Weka</h1><p className="mt-4 text-muted-foreground">Academic report</p></div>
          <TeamTable />
          <p className="text-sm">Build date: {formatDate(report.generatedAt)}</p>
        </section>

        <section className="paper-numbered-section space-y-4"><h2 className="font-serif text-2xl font-bold">Abstract</h2><p className="text-sm leading-7">CreditMiner predicts default payment next month for {sourceRows == null ? "credit-card clients" : `${formatInt(sourceRows)} credit-card clients`} in the UCI dataset 350. The data records client attributes and payment behavior from April to September 2005. The workflow {preparationSteps.length ? preparationSteps.join("; ") : "uses the recorded preprocessing steps"}. {classifierCount ? formatInt(classifierCount) : "The available"} Weka classifiers are compared with baseline, SMOTE, and cost-sensitive variants. Stratified {split?.cvFolds == null ? "cross-validation" : `${formatInt(split.cvFolds)}-fold cross-validation`} selects the model using the evaluation rule in Section 6. {best ? `${modelLabel(best.algo, best.variant)} reaches CV F1 ${metricText(best.cv?.f1Default, 1)}, holdout F1 ${metricText(best.test?.f1Default, 1)}, and holdout ROC-AUC ${metricText(best.test?.rocAuc, 1)}.` : "The selected-model metrics are unavailable."} K-means, Apriori, anomaly detection, and GSP add descriptive evidence. {sequence?.featureExperiment?.patternSelection ? "The sequence experiment selects patterns inside each CV fold to prevent leakage. " : ""}The report also records model build, cross-validation, and holdout prediction times. Results support model comparison, but they do not establish performance on a later time period.</p></section>

        <div className="paper-numbered-section"><IntroductionSection report={report} id="paper-introduction" title="1 Introduction" /></div>

        <ReportSection id="paper-dataset-section" title="2 Dataset" className="paper-numbered-section">
          <p className="text-sm leading-6 text-muted-foreground">Step 1 loads and profiles the UCI Default of Credit Card Clients dataset, which describes clients in Taiwan [1, 2]. The target is default payment next month.</p>
          <ReportTable id="paper-dataset" caption="Dataset summary."><table className="w-full text-sm"><tbody>{[
            ["Source clients", sourceRows == null ? "n/a" : formatInt(sourceRows)], ["Prepared clients", formatInt(report.dataset.totalRows)], ["Columns", formatInt(report.dataset.totalColumns)], ["Default clients", formatInt(report.dataset.defaultCustomers)], ["Default rate", formatPct(report.dataset.defaultRate)], ["Period", "April-September 2005"],
          ].map(([label, value]) => <tr key={label} className="border-b last:border-0"><th className="p-2 text-left">{label}</th><td className="p-2 text-right">{value}</td></tr>)}</tbody></table></ReportTable>
        </ReportSection>

        <ReportSection id="paper-preprocessing-section" title="3 Preprocessing" className="paper-numbered-section">
          <p className="text-sm leading-6 text-muted-foreground">Steps 1-3 prepare the data; Step 4 creates the split. Step 2 cleans the data and Step 3 engineers features. {preparationSteps.length ? `Together, these steps produce a workflow that ${preparationSteps.join("; ")}.` : "No preprocessing actions were recorded."}</p>
          <ReportTable id="paper-preprocessing" caption="Preparation and split evidence (Steps 1-4)."><table className="w-full text-sm"><tbody>{preprocessingRows.map(([label, cell]) => <tr key={label} className="border-b last:border-0"><th className="p-2 text-left">{label}</th><td className="p-2 text-right">{cell}</td></tr>)}</tbody></table></ReportTable>
        </ReportSection>

        <ReportSection id="paper-classification" title="4 Classification" className="paper-numbered-section">
          <p className="text-sm leading-6 text-muted-foreground">Step 4 reads the prepared train and test data as ARFF to train and evaluate classifiers. Weka 3.8.6 runs {classifiers.length ? classifiers.join(", ") : "the configured classifiers"} through Java [3, 4].</p>
          <pre className="max-w-full overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs"><code>{`Instances train = DataSource.read(trainPath);\nClassifier model = new RandomForest();\nmodel.buildClassifier(train);`}</code></pre>
          <ReportTable id="paper-algorithms" caption="Classification algorithms and key parameters."><table className="w-full text-xs"><thead><tr className="border-b"><th className="p-2 text-left">Algorithm</th><th className="p-2 text-left">Method</th><th className="p-2 text-left">Parameters</th></tr></thead><tbody>{baselineVariants.map((variant) => {
            const parameters = variant.hyperparameters?.summary ?? variant.hyperparameters?.options ?? "n/a";
            return <tr key={`${variant.algo}-${variant.variant}`} className="border-b last:border-0"><td className="p-2">{modelLabel(variant.algo, variant.variant)}</td><td className="p-2">{algorithmMethod(variant.algo)}</td><td className="p-2">{parameters}</td></tr>;
          })}</tbody></table></ReportTable>
        </ReportSection>

        <ReportSection id="paper-improvements" title="5 Modelling" className="paper-numbered-section">
          <h3 className="report-heading text-lg font-semibold">5.1 Algorithms</h3>
          <h4 className="report-heading font-semibold">Improvements</h4>
          <div className="space-y-2 text-sm leading-6 text-muted-foreground"><p>Step 4 applies SMOTE only inside training folds [7]. Cost-sensitive models use the cost matrix recorded in each variant&apos;s API hyperparameters.</p><p>K-means groups clients into personas [11]. Apriori extracts association rules [8]. GSP mines repayment sequences separately for both outcome groups [9, 12].</p></div>
          <section aria-label="Cluster profiles" className="space-y-3">
            <h3 className="report-heading text-lg font-semibold">5.2 Personas (K-means)</h3>
            <p className="text-sm text-muted-foreground">
              Step 5 groups clients into personas and detects anomalies. k = {chosenK} chosen for interpretability (silhouette {formatDecimal(silhouette, 3)}).
              {kTwo ? ` The k = ${kTwo.k} sweep scores ${formatDecimal(kTwo.silhouette, 3)}.` : ""}
            </p>
            {clusterSelection?.chosenReason ? <p className="text-sm text-muted-foreground">{clusterSelection.chosenReason}</p> : null}
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {clusters.map((cluster) => <ClusterCard key={cluster.clusterId} cluster={cluster}
                lowest={cluster.clusterId === lowestId} baselineRate={report.dataset.defaultRate}
                defaultRate={getFact(`default-rate-cluster-${cluster.clusterId}`).value ?? cluster.defaultRate}
                clientShare={getFact(`share-of-clients-cluster-${cluster.clusterId}`).value ?? cluster.shareOfClients ?? cluster.size / report.dataset.totalRows}
                defaultShare={getFact(`share-of-defaults-cluster-${cluster.clusterId}`).value ?? cluster.shareOfDefaults}
              />)}
            </div>
            <div className="max-w-full overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-xs" aria-label="Persona centroids">
                <thead><tr className="border-b"><th className="p-2 text-left">Feature</th>
                  {clusters.map((cluster) => <th key={cluster.clusterId} className="p-2 text-right">{cluster.displayName ?? cluster.personaName}</th>)}
                </tr></thead>
                <tbody>{centroidFeatures.map((feature) => <tr key={feature} className="border-b">
                  <th className="p-2 text-left">{centroidLabel(feature)}</th>
                  {clusters.map((cluster) => <td key={cluster.clusterId} className="p-2 text-right tabular-nums">{formatCentroid(feature, feature === "MAX_DELAY" ? cluster.longestDelayMonths ?? cluster.centroid[feature] : cluster.centroid[feature])}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
            {clusters.some((cluster) => cluster.longestDelayMonths == null) ? <p className="text-xs text-muted-foreground">Longest delay uses the legacy centroid mean where clipped delay months are unavailable; negative repayment codes are included in that mean.</p> : null}
          </section>
          <section aria-label="Association rule evidence" className="min-w-0 space-y-3">
            <h3 className="report-heading text-lg font-semibold">5.3 Association rules and anomalies</h3>
            <p className="text-sm text-muted-foreground">
              Step 6 mines association rules for both outcomes. The combined anomaly checks from Step 5
              identify {formatInt(report.anomalies.combinedAnomalyCount ?? report.anomalies.dbAnomalyCount)} clients for review.
            </p>
            {(["default", "non-default"] as const).map((category) => <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium">{category === "default" ? "Default" : "Non-default"} families</h4>
              <div className="max-w-full overflow-x-auto rounded-lg border">
                {(category === "default" ? defaultFamilies : nonDefaultFamilies).isLoading ? <p className="p-3 text-sm">Loading rule families...</p>
                  : (category === "default" ? defaultFamilies : nonDefaultFamilies).error ? <p className="p-3 text-sm text-danger">Rule families are unavailable.</p>
                  : <FamilyRulesTable families={(category === "default" ? defaultFamilies : nonDefaultFamilies).data?.families ?? []} outcome={category} />}
              </div>
            </div>)}
          </section>
          <h3 className="report-heading text-lg font-semibold">5.4 Sequence mining</h3>
          <p className="text-sm text-muted-foreground">Step 7 mines repayment sequences and evaluates their added predictive value.</p>
          {sequence ? <SequenceEvidence artifact={sequence} limit={8} ids={SEQUENCE_IDS} showRuntime={false} compact /> : <EmptyEvidence>The sequence-mining artifact is unavailable or invalid.</EmptyEvidence>}
        </ReportSection>

        <div className="paper-numbered-section"><EvaluationSection report={report} beforeRuntime={<><p className="text-sm leading-6 text-muted-foreground">Step 4 uses stratified {split?.cvFolds == null ? "CV" : `${formatInt(split.cvFolds)}-fold CV`} on the training split [10]. {holdoutRatio == null ? "The untouched holdout checks final metrics." : `The untouched ${formatPct(holdoutRatio, 0)} holdout checks final metrics.`}</p><ModelComparisonTable rows={comparisonRows(report)} best={best} appendix splitMetrics tableId="paper-model-comparison" /></>} ids={{ runtimeFigure: "paper-quality-runtime", runtimeTable: "paper-variant-runtime", roc: "paper-roc-curves", pr: "paper-pr-curves", best: "paper-best-confusion", others: "paper-other-confusions" }} /></div>

        <div className="paper-numbered-section"><InsightsSection report={report} visuals={insightVisuals} tableOnly id="paper-insights" title="7 Insights" /></div>
        <div className="paper-numbered-section"><ConclusionsSection report={report} id="paper-conclusions" title="8 Conclusions" /></div>
        <div className="paper-numbered-section"><ReferencesSection id="paper-references" /></div>
        <RunCommandsAppendix id="paper-commands" title="Appendix A Run commands" />
        <ReportSection id="paper-parameters-section" title="Appendix B Parameters" appendix>
          <ReportTable id="paper-parameters" caption="Classification parameters and timing fields." allowPageBreak><table className="w-full text-xs"><thead><tr className="border-b"><th className="p-2 text-left">Model</th><th className="p-2 text-left">Options</th><th className="p-2 text-right">Build</th><th className="p-2 text-right">Predict</th></tr></thead><tbody>{(report.classification.evaluation?.variants ?? []).map((row) => <tr key={`${row.algo}-${row.variant}`} className="border-b last:border-0"><td className="p-2">{modelLabel(row.algo, row.variant)}</td><td className="p-2">{row.hyperparameters?.summary ?? row.hyperparameters?.options ?? "n/a"}</td><td className="p-2 text-right">{value(row.buildTimeMs ?? row.trainTimeMs)} ms</td><td className="p-2 text-right">{value(row.testPredictTimeMs)} ms</td></tr>)}</tbody></table></ReportTable>
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
