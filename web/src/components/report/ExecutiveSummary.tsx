"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Boxes, TrendingUp, UserMinus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useClusters } from "@/hooks/useClusters";
import { useFacts } from "@/hooks/useFacts";
import { formatInt, formatPct } from "@/lib/utils";
import type { EvaluationVariant, MiningReport } from "@/types/api.types";
import { ReportDetails, ReportSection } from "./ReportPrimitives";
import { DEFAULT_SELECTION_RULE } from "./report-copy";

export function findBestVariant(report: MiningReport): EvaluationVariant | undefined {
  const selected = report.classification.evaluation?.bestVariant;
  const variants = report.classification.evaluation?.variants ?? [];
  return (
    variants.find(
      (variant) => variant.algo === selected?.algo && variant.variant === selected?.variant,
    ) ??
    // Fallback mirrors the API selection rule: CV F1 (Default=Yes) first, CV ROC AUC as the tiebreaker.
    variants
      .filter((variant) => variant.cv?.f1Default != null)
      .sort(
        (a, b) =>
          (b.cv?.f1Default ?? -1) - (a.cv?.f1Default ?? -1) ||
          (b.cv?.rocAuc ?? -1) - (a.cv?.rocAuc ?? -1),
      )[0]
  );
}

export function findDeployedVariant(report: MiningReport): EvaluationVariant | undefined {
  return (report.classification.evaluation?.variants ?? []).find(
    (variant) => variant.isCanonical && variant.algo?.toLowerCase() === "randomforest",
  );
}

export function modelDeploymentStatement(report: MiningReport): string {
  const best = findBestVariant(report);
  const deployed = findDeployedVariant(report);
  const bestName = `${best?.algo ?? report.classification.bestModel} (${best?.variant ?? report.classification.bestVariant})`;
  const selectionRule = report.classification.evaluation?.bestVariant?.selectionRule ?? DEFAULT_SELECTION_RULE;
  const deployedName = modelName(
    deployed?.algo ?? report.classification.bestModel,
    deployed?.variant ?? "canonical",
  );
  return `${bestName} is the selected model under the rule: ${selectionRule}. The prediction API uses ${deployedName}.`;
}

export function ExecutiveSummary({ report }: { report: MiningReport }) {
  const { getFact } = useFacts({ report });
  const { data: enrichedClusters } = useClusters();
  const defaultRate = getFact("default-rate").value ?? report.dataset.defaultRate;
  const totalClients = getFact("total-clients").value ?? report.dataset.totalRows;
  const defaultCount = getFact("default-count").value ?? report.dataset.defaultCustomers;
  const highestRisk = report.clustering.clusters
    .map((cluster) => ({ ...cluster, ...(enrichedClusters?.find((item) => item.clusterId === cluster.clusterId) ?? {}) }))
    .sort((a, b) =>
      (getFact("default-rate-cluster-" + b.clusterId).value ?? b.defaultRate) -
      (getFact("default-rate-cluster-" + a.clusterId).value ?? a.defaultRate),
    )[0];
  const anomalyCount = report.anomalies.combinedAnomalyCount ?? report.anomalies.dbAnomalyCount;
  const best = findBestVariant(report);

  return (
      <ReportSection
        id="section-2"
        title="2 Executive summary"
        takeaway={`${formatPct(defaultRate)} of clients defaulted the next month. Behavior, segment, and model results show where to review risk.`}
      >
        <Card className="break-inside-avoid overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="secondary">CRISP-DM report</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryMetric
                icon={UserMinus}
                label="Default rate"
                value={formatPct(defaultRate)}
                note={`${formatInt(defaultCount)} clients`}
              />
              <ModelScoreTile variant={best} fallback={report.classification.bestModel}
                f1={getFact("selected-model-holdout-f1").value ?? best?.test?.f1Default}
                rocAuc={getFact("selected-model-holdout-auc").value ?? best?.test?.rocAuc}
              />
              <SummaryMetric
                icon={Boxes}
                label="Highest-default segment"
                value={highestRisk ? formatPct(getFact("default-rate-cluster-" + highestRisk.clusterId).value ?? highestRisk.defaultRate) : "n/a"}
                note={highestRisk?.displayName ?? highestRisk?.personaName ?? "No segment"}
              />
              <SummaryMetric
                icon={TrendingUp}
                label="Top rule lift"
                value={`${report.rules.maxLift.toFixed(2)}x`}
                note={`${formatInt(report.rules.totalRules)} rules`}
              />
              <SummaryMetric
                icon={AlertTriangle}
                label="Anomalies"
                value={formatInt(anomalyCount)}
                note={
                  report.anomalies.combinedAnomalyPct == null
                    ? undefined
                    : formatPct(report.anomalies.combinedAnomalyPct)
                }
              />
              <SummaryMetric
                icon={Users}
                label="Clients"
                value={formatInt(totalClients)}
                note={`${report.clustering.bestK} segments`}
              />
            </div>

            <p className="text-sm font-medium leading-6">{modelDeploymentStatement(report)}</p>
            <div className="report-running-line border-t pt-3 text-xs text-muted-foreground">
              CreditMiner report. Generated {formatReportDate(report.generatedAt)}.
            </div>
          </CardContent>
        </Card>
        {report.warnings.length > 0 ? (
          <ReportDetails label="Data warnings">
            <ul className="space-y-2">
              {report.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </ReportDetails>
        ) : null}
      </ReportSection>
  );
}

function ModelScoreTile({ variant, fallback, f1, rocAuc }: {
  variant?: EvaluationVariant; fallback: string; f1?: number | null; rocAuc?: number | null;
}) {
  const scores = [
    ["F1", f1],
    ["ROC-AUC", rocAuc],
    ["PR-AUC", variant?.test?.prAuc],
  ] as const;
  return (
    <Card className="break-inside-avoid border-primary/30 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">Best model</p>
        <p className="mt-1 truncate text-lg font-bold" title={variant?.algo ?? fallback}>
          {variant?.algo ?? fallback}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {scores.map(([label, score]) => (
            <ScoreRing key={label} label={label} score={score} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreRing({ label, score }: { label: string; score?: number | null }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.min(Math.max(score ?? 0, 0), 1);
  return (
    <div className="min-w-0 text-center">
      <div className="relative mx-auto h-12 w-12" aria-label={`${label} ${formatScore(score)}`}>
        <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="5"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - bounded)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
          {score == null ? "n/a" : Math.round(score * 100)}
        </span>
      </div>
      <p className="mt-1 truncate text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Card className="break-inside-avoid shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-2 truncate text-3xl font-bold tabular-nums" title={value}>
          {value}
        </p>
        {note ? <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function modelName(model: string, variant: string): string {
  return `${model} (${variant === "cost" ? "cost-sensitive" : variant})`;
}

function formatScore(value?: number | null): string {
  return value == null ? "not available" : formatPct(value);
}

export function formatReportDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
