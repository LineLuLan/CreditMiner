"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  Database,
  Rocket,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { useMiningReport } from "@/hooks/useMiningReport";
import { formatInt, formatPct } from "@/lib/utils";
import type { MiningReport } from "@/types/api.types";

export default function PipelinePage() {
  const { data, isLoading, error } = useMiningReport();

  return (
    <div className="methodology-page flex min-w-0 flex-col">
      <Header title="Methodology" />
      <div className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
        {isLoading ? (
          <>
            <Skeleton className="h-48" />
            <Skeleton className="h-[520px]" />
          </>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex gap-2 p-5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              {(error as { message?: string }).message ?? "Methodology unavailable"}
            </CardContent>
          </Card>
        ) : data ? (
          <Methodology report={data} />
        ) : null}
      </div>
    </div>
  );
}

function Methodology({ report }: { report: MiningReport }) {
  const method = report.methodology;
  const split = report.classification.evaluation?.split ?? method?.split;
  const cluster = method?.clustering;
  const rules = method?.associationRules;
  const best = report.classification.evaluation?.bestVariant;
  const modelRows = report.classification.evaluation?.variants ?? [];
  const phases: PhaseProps[] = [
    {
      number: 1,
      icon: Target,
      title: "Business understanding",
      sentence: "Define churn risk and rank customers for retention.",
      chips: [
        ["Target", "Churn"],
        ["Churn rate", formatPct(report.dataset.churnRate)],
      ],
      href: "/mining-report#section-2",
    },
    {
      number: 2,
      icon: Database,
      title: "Data understanding",
      sentence: "Profile rows, columns, missing values, and customer groups.",
      chips: [
        ["Rows", formatInt(report.dataset.totalRows)],
        ["Columns", formatInt(report.dataset.totalColumns)],
        ["Missing", formatInt(report.dataset.totalMissingValues)],
      ],
      href: "/mining-report#section-3",
    },
    {
      number: 3,
      icon: SlidersHorizontal,
      title: "Data preparation",
      sentence: "Rewrite unknown values, flag outliers, and create derived features.",
      chips: [
        ["Rows in", value(method?.preprocessing?.rowsIn)],
        ["Rows out", value(method?.preprocessing?.rowsOut)],
        ["Duplicates", value(method?.preprocessing?.duplicatesDropped)],
        ["Derived", value(method?.featureEngineering?.derivedFeatures?.length)],
      ],
      href: "/mining-report#section-4",
    },
    {
      number: 4,
      icon: Boxes,
      title: "Modelling",
      sentence: "Train classifiers, segments, rules, and anomaly detection.",
      chips: [
        ["Train ratio", split?.trainRatio == null ? "n/a" : formatPct(split.trainRatio)],
        ["Seed", value(split?.seed)],
        ["CV folds", value(split?.cvFolds)],
        ["SMOTE rows", value(split?.smoteTrainRows)],
        ["k", `${value(cluster?.kMin)}-${value(cluster?.kMax)}, chosen ${value(cluster?.bestK)}`],
        [
          "Apriori churn",
          `support ${value(rules?.churnPass?.minSupport)}, lift ${value(rules?.churnPass?.minLift)}`,
        ],
      ],
      href: "/mining-report#section-5",
    },
    {
      number: 5,
      icon: BarChart3,
      title: "Evaluation",
      sentence: "Compare models with cross-validation and untouched test data.",
      chips: [
        ["Variants", formatInt(report.classification.modelMetrics.length)],
        ["Best model", best?.algo ?? report.classification.bestModel],
        ["Best variant", best?.variant ?? report.classification.bestVariant],
      ],
      href: "/mining-report#section-6",
    },
    {
      number: 6,
      icon: Rocket,
      title: "Deployment",
      sentence: "Serve saved artifacts through API routes and the dashboard.",
      chips: [
        ["Report API", "/api/mining-report"],
        ["Predict API", "/api/predict"],
      ],
      href: "/mining-report",
    },
  ];

  return (
    <>
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="secondary">CRISP-DM</Badge>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">From data to decision</h1>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Each result follows a measured and repeatable process.
            </p>
          </div>
          <PipelineDiagram />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {phases.map((phase) => (
          <Phase key={phase.number} {...phase} />
        ))}
      </div>

      <details className="rounded-lg border bg-card">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Model hyperparameters
        </summary>
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Variant</th>
                <th className="px-4 py-2 font-medium">Parameters</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((row, index) => (
                <tr key={`${row.algo ?? "model"}-${row.variant ?? index}`} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{row.algo ?? "Model"}</td>
                  <td className="px-4 py-2">{row.variant ?? "Variant"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.hyperparameters?.summary ?? row.hyperparameters?.options ?? "Not available"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function PipelineDiagram() {
  const steps = ["Understand", "Profile", "Prepare", "Model", "Evaluate", "Serve"];

  return (
    <div
      className="grid grid-cols-2 items-center gap-2 sm:grid-cols-3 lg:flex"
      role="img"
      aria-label="Six-step data mining pipeline"
    >
      {steps.map((step, index) => (
        <div key={step} className="contents">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-background/85 p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <span className="truncate text-sm font-semibold">{step}</span>
          </div>
          {index < steps.length - 1 ? (
            <ArrowRight className="hidden h-4 w-4 shrink-0 text-primary lg:block" aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface PhaseProps {
  number: number;
  icon: LucideIcon;
  title: string;
  sentence: string;
  chips: Array<[string, string]>;
  href: string;
}

function Phase({ number, icon: Icon, title, sentence, chips, href }: PhaseProps) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Phase {number}</p>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{sentence}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map(([label, chipValue]) => (
            <DataChip key={`${label}-${chipValue}`} label={label} value={chipValue} />
          ))}
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          View evidence
        </Link>
      </CardContent>
    </Card>
  );
}

function value(input: string | number | null | undefined): string {
  return input == null ? "n/a" : String(input);
}
