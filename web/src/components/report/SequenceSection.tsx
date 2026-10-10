"use client";

import { useSequences } from "@/hooks/useSequences";
import { SequenceSupportChart } from "@/components/charts/SequenceSupportChart";
import { Card, CardContent } from "@/components/ui/card";
import { formatInt, formatPct } from "@/lib/utils";
import { humanisePattern, selectSequenceStories } from "@/lib/sequence-format";
import { EmptyEvidence, ReportFigure, ReportTable, Takeaway } from "./ReportPrimitives";
import {
  parseSequenceArtifact,
  type SequenceArtifactView,
  type SequencePattern,
} from "./sequence-data";

export interface SequenceCaptionIds {
  mapping: string;
  supportFigure: string;
  nonDefault: string;
  experiment: string;
}

const REPORT_IDS: SequenceCaptionIds = {
  mapping: "sequence-item-mapping",
  supportFigure: "sequence-support",
  nonDefault: "sequence-non-default",
  experiment: "sequence-feature-experiment",
};

export function SequenceSection({ value }: { value: unknown }) {
  const artifact = parseSequenceArtifact(value);
  return (
    <div id="section-5-3" className="scroll-mt-20 space-y-5">
      <h3 className="report-heading text-xl font-semibold">5.3 Sequence mining</h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Generalized Sequential Patterns (GSP) finds ordered subsequences that meet a support
        threshold [9]. The pipeline mines defaulters and non-defaulters separately, then measures
        exact support by subsequence containment.
      </p>
      {artifact ? (
        <SequenceEvidence artifact={artifact} limit={8} ids={REPORT_IDS} compact />
      ) : (
        <EmptyEvidence>The sequence-mining artifact is unavailable or invalid.</EmptyEvidence>
      )}
    </div>
  );
}

export function SequenceEvidence({
  artifact: fallbackArtifact,
  limit,
  ids,
  showRuntime = true,
  compact = false,
}: {
  artifact: SequenceArtifactView;
  limit: number;
  ids: SequenceCaptionIds;
  showRuntime?: boolean;
  compact?: boolean;
}) {
  const { data: currentArtifact } = useSequences();
  const artifact = currentArtifact ?? fallbackArtifact;
  const stories = selectSequenceStories(artifact);
  const defaults = stories.defaultStories.slice(0, limit);
  const nonDefaults = stories.nonDefaultStories.slice(0, limit);
  return (
    <div className="space-y-5">
      <Takeaway>{sequenceRemark(artifact)}</Takeaway>
      {defaults[0] ? <p className="break-words text-sm leading-6">
        Leading default story: {humanisePattern(defaults[0]).text}. Support is {formatPct(defaults[0].supportDefault)} among defaulters and {formatPct(defaults[0].supportNonDefault)} among non-defaulters; prevalence ratio {(defaults[0].groupPrevalenceRatio ?? defaults[0].ratio).toFixed(2)}x.
      </p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Default sequences" value={formatInt(artifact.groups.default.sequences)} />
        <Metric
          label="Default patterns"
          value={formatInt(artifact.groups.default.frequentPatterns)}
        />
        <Metric
          label="Non-default sequences"
          value={formatInt(artifact.groups.nonDefault.sequences)}
        />
        <Metric
          label="Non-default patterns"
          value={formatInt(artifact.groups.nonDefault.frequentPatterns)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        The requested support is {formatPct(artifact.minSupport)}. The used support is{" "}
        {formatPct(artifact.groups.default.minSupportUsed)} for defaulters and{" "}
        {formatPct(artifact.groups.nonDefault.minSupportUsed)} for non-defaulters. The order is{" "}
        {artifact.itemMapping.order}.
      </p>
      {artifact.itemMapping.oldestMonthReference ? (
        <p className="break-words text-sm text-muted-foreground">
          {artifact.itemMapping.oldestMonthReference}.{" "}
          {artifact.itemMapping.payment.NO_BALANCE
            ? "NO_BALANCE means the reference bill was non-positive; COVERED means a payment covered a positive reference bill."
            : null}
        </p>
      ) : null}
      <details
        open={!compact}
        className={`report-detail-print min-w-0 max-w-full ${compact ? "rounded-lg border bg-card" : "contents"}`}
      >
      <summary className={compact ? "cursor-pointer px-4 py-3 text-sm font-semibold text-primary" : "hidden"}>Sequence tables and chart</summary>
      <div className={compact ? "report-details-body space-y-5 border-t p-4" : "space-y-5"}>
      <ReportTable id={ids.mapping} caption="Sequence item mapping used by GSP.">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="p-3 text-left">Item type</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Definition</th>
            </tr>
          </thead>
          <tbody>
            {mappingRows(artifact).map(([type, item, definition]) => (
              <tr key={`${type}-${item}`} className="border-b last:border-0">
                <td className="p-3 font-medium">{type}</td>
                <td className="p-3 font-mono">{item}</td>
                <td className="p-3">{definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTable>
      <ReportFigure
        id={ids.supportFigure}
        caption={`Support in each group for the top ${defaults.length} default-associated patterns.`}
      >
        <Card>
          <CardContent className="p-3">
            <SequenceSupportChart patterns={defaults} />
          </CardContent>
        </Card>
      </ReportFigure>
      <ReportTable
        id={ids.nonDefault}
        caption={`Top ${nonDefaults.length} non-default-associated sequence patterns.`}
      >
        <PatternTable patterns={nonDefaults} />
      </ReportTable>
      <SequenceFeatureExperimentTable artifact={artifact} id={ids.experiment} />
      </div>
      </details>
      {showRuntime ? <SequenceRuntime artifact={artifact} /> : null}
    </div>
  );
}

export function SequenceFeatureExperimentTable({
  artifact,
  id,
}: {
  artifact: SequenceArtifactView;
  id: string;
}) {
  return (
    <ReportTable
      id={id}
      caption={`Base features compared with ${artifact.featureExperiment.k} sequence features selected inside each CV fold.`}
    >
      <table className="w-full min-w-[880px] text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-3 text-left">Algorithm</th>
            <th className="p-3 text-left">Features</th>
            <th className="p-3 text-right">CV F1</th>
            <th className="p-3 text-right">CV ROC-AUC</th>
            <th className="p-3 text-right">Test F1</th>
            <th className="p-3 text-right">Test ROC-AUC</th>
            <th className="p-3 text-right">Build</th>
            <th className="p-3 text-right">CV time</th>
          </tr>
        </thead>
        <tbody>
          {artifact.featureExperiment.results.map((row) => (
            <tr key={`${row.algo}-${row.features}`} className="border-b last:border-0">
              <td className="p-3 font-semibold">{row.algo}</td>
              <td className="p-3">{row.features}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(row.cv.f1, 2)}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(row.cv.rocAuc, 2)}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(row.test.f1, 2)}</td>
              <td className="p-3 text-right tabular-nums">{formatPct(row.test.rocAuc, 2)}</td>
              <td className="p-3 text-right tabular-nums">{formatMs(row.buildTimeMs)}</td>
              <td className="p-3 text-right tabular-nums">{formatMs(row.cvTimeMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

export function SequenceRuntime({ artifact }: { artifact: SequenceArtifactView }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Build sequences" value={formatMs(artifact.runtime.buildSequencesMs)} />
      <Metric label="GSP, default" value={formatMs(artifact.runtime.gspDefaultMs)} />
      <Metric label="GSP, non-default" value={formatMs(artifact.runtime.gspNonDefaultMs)} />
    </div>
  );
}

function PatternTable({ patterns }: { patterns: SequencePattern[] }) {
  return (
    <table className="w-full min-w-[760px] text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="p-3 text-left">Pattern</th>
          <th className="p-3 text-right">Length</th>
          <th className="p-3 text-right">Default support</th>
          <th className="p-3 text-right">Non-default support</th>
          <th className="p-3 text-right">Difference</th>
          <th className="p-3 text-right">Ratio</th>
        </tr>
      </thead>
      <tbody>
        {patterns.map((row) => (
          <tr key={row.pattern} className="border-b last:border-0">
            <td className="max-w-md break-words p-3">{humanisePattern(row).text}</td>
            <td className="p-3 text-right tabular-nums">{row.length}</td>
            <td className="p-3 text-right tabular-nums">{formatPct(row.supportDefault)}</td>
            <td className="p-3 text-right tabular-nums">{formatPct(row.supportNonDefault)}</td>
            <td className="p-3 text-right tabular-nums">{formatSigned(row.supportDiff)}</td>
            <td className="p-3 text-right tabular-nums">{(row.groupPrevalenceRatio ?? row.ratio).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function mappingRows(artifact: SequenceArtifactView): Array<[string, string, string]> {
  return [
    ...Object.entries(artifact.itemMapping.status).map(
      ([item, definition]) => ["Status", item, definition] as [string, string, string],
    ),
    ...Object.entries(artifact.itemMapping.payment).map(
      ([item, definition]) => ["Payment", item, definition] as [string, string, string],
    ),
  ];
}

function sequenceRemark(artifact: SequenceArtifactView): string {
  const rows = artifact.featureExperiment.results;
  const algorithm = rows.some((row) => row.algo === "RANDOMFOREST")
    ? "RANDOMFOREST"
    : rows[0]?.algo;
  const base = rows.find((row) => row.algo === algorithm && row.features === "base");
  const augmented = rows.find((row) => row.algo === algorithm && row.features === "base+seq");
  if (!algorithm || !base || !augmented) return "The sequence-feature comparison is unavailable.";
  const change = augmented.cv.f1 - base.cv.f1;
  return `The pattern features change CV F1 by ${formatSigned(change, 4)} for ${algorithm}.`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="break-inside-avoid">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatMs(value: number): string {
  return `${formatInt(value)} ms`;
}

function formatSigned(value: number, digits = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}
