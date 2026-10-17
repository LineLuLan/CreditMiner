"use client";

import type { EdaDefaultGroup, InsightVisual, MiningReport, Rule } from "@/types/api.types";
import { ClassificationSection } from "./ClassificationSection";
import { AlgorithmCards } from "./AlgorithmCards";
import { ClusteringSection } from "./ClusteringSection";
import { ConclusionsSection } from "./ConclusionsSection";
import { DataPreparationSection, DataUnderstandingSection } from "./DataSections";
import { EvaluationSection } from "./EvaluationSection";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { IntroductionSection } from "./IntroductionSection";
import { Appendices, InsightsSection, LimitationsSection } from "./InsightsAndAppendices";
import { CaptionRegistry, ReportSection, usePrintExpandedDetails } from "./ReportPrimitives";
import { ReportToc } from "./ReportToc";
import { ReferencesSection } from "./ReferencesSection";
import { AnomalySection, RulesSection } from "./RulesAndAnomalySections";
import { RunCommandsAppendix } from "./RunCommandsAppendix";
import { SequenceSection } from "./SequenceSection";

export function MiningReportDocument({
  report,
  defaultRules,
  nonDefaultRules,
  defaultBy,
  defaultDimension,
  insightVisuals,
}: {
  report: MiningReport;
  defaultRules?: Rule[];
  nonDefaultRules?: Rule[];
  defaultBy?: EdaDefaultGroup[];
  defaultDimension: string;
  insightVisuals?: InsightVisual[];
}) {
  usePrintExpandedDetails();
  return (
    <CaptionRegistry>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <ReportToc />
        <main className="report-document min-w-0 space-y-10">
          <IntroductionSection report={report} />
          <ExecutiveSummary report={report} />
          <DataUnderstandingSection
            report={report}
            defaultBy={defaultBy}
            defaultDimension={defaultDimension}
          />
          <DataPreparationSection report={report} />
          <ReportSection
            id="section-5"
            title="5 Modelling"
            takeaway="Classification, personas, rules, anomalies, and sequences show different parts of default risk."
          >
            <section aria-label="Algorithms and improvements" className="space-y-5">
              <AlgorithmCards report={report} />
              <div className="section-divider" />
              <ClassificationSection report={report} />
            </section>
            <div className="section-divider" />
            <ClusteringSection report={report} />
            <div className="section-divider" />
            <section id="section-5-3" className="scroll-mt-20 space-y-5">
              <h3 className="report-heading text-xl font-semibold">5.3 Association rules and anomalies</h3>
              <RulesSection
                report={report}
                defaultRules={defaultRules}
                nonDefaultRules={nonDefaultRules}
              />
              <div className="section-divider" />
              <AnomalySection report={report} />
            </section>
            <div className="section-divider" />
            <SequenceSection value={report.sequences} />
          </ReportSection>
          <EvaluationSection report={report} compactRuntime />
          <InsightsSection report={report} visuals={insightVisuals} />
          <LimitationsSection report={report} />
          <ConclusionsSection report={report} />
          <ReferencesSection />
          <Appendices report={report} />
          <RunCommandsAppendix collapsed />
        </main>
      </div>
    </CaptionRegistry>
  );
}
