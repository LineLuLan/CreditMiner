"use client";

import { useEffect } from "react";
import type { EdaChurnGroup, InsightVisual, MiningReport, Rule } from "@/types/api.types";
import { ClassificationSection } from "./ClassificationSection";
import { ClusteringSection } from "./ClusteringSection";
import { DataPreparationSection, DataUnderstandingSection } from "./DataSections";
import { EvaluationSection } from "./EvaluationSection";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { Appendices, InsightsSection, LimitationsSection } from "./InsightsAndAppendices";
import { CaptionRegistry, ReportSection, ReportToc } from "./ReportPrimitives";
import { AnomalySection, RulesSection } from "./RulesAndAnomalySections";

/**
 * Browsers do not print the body of a closed <details>, and CSS cannot force it open.
 * Open every print-marked <details> before printing and restore the screen state after.
 */
function usePrintExpandedDetails() {
  useEffect(() => {
    const selector = "details.report-detail-print, details.report-evidence-notes";
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>(selector)).filter((d) => !d.open);
      opened.forEach((d) => (d.open = true));
    };
    const after = () => {
      opened.forEach((d) => (d.open = false));
      opened = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
}

export function MiningReportDocument({
  report,
  churnRules,
  retentionRules,
  churnBy,
  churnDimension,
  insightVisuals,
}: {
  report: MiningReport;
  churnRules?: Rule[];
  retentionRules?: Rule[];
  churnBy?: EdaChurnGroup[];
  churnDimension: string;
  insightVisuals?: InsightVisual[];
}) {
  usePrintExpandedDetails();
  return (
    <CaptionRegistry>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ReportToc />
        <main className="report-document min-w-0 space-y-10">
          <ExecutiveSummary report={report} />
          <DataUnderstandingSection
            report={report}
            churnBy={churnBy}
            churnDimension={churnDimension}
          />
          <DataPreparationSection report={report} />
          <ReportSection
            id="section-5"
            title="5 Modelling"
            takeaway="Classification, segments, rules, and anomalies show different parts of churn risk."
          >
            <ClassificationSection report={report} />
            <div className="section-divider" />
            <ClusteringSection report={report} />
            <div className="section-divider" />
            <RulesSection report={report} churnRules={churnRules} retentionRules={retentionRules} />
            <div className="section-divider" />
            <AnomalySection report={report} />
          </ReportSection>
          <EvaluationSection report={report} />
          <InsightsSection report={report} visuals={insightVisuals} />
          <LimitationsSection report={report} />
          <Appendices report={report} />
        </main>
      </div>
    </CaptionRegistry>
  );
}
