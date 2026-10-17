"use client";

import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Boxes,
  Database,
  Filter,
  GitBranch,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { useMiningReport } from "@/hooks/useMiningReport";
import { formatInt, formatPct } from "@/lib/format";
import type { MiningReport } from "@/types/api.types";

export default function PipelinePage() {
  const { data, isLoading, error } = useMiningReport();

  return (
    <div className="methodology-page flex min-w-0 flex-col">
      <Header title="Methodology" />
      <div className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
        {isLoading ? <><Skeleton className="h-48" /><Skeleton className="h-[520px]" /></> : error ? (
          <Card className="border-danger/50"><CardContent className="flex gap-2 p-5 text-sm text-danger"><AlertCircle className="h-4 w-4" aria-hidden />{(error as { message?: string }).message ?? "Methodology unavailable"}</CardContent></Card>
        ) : data ? <Methodology report={data} /> : null}
      </div>
    </div>
  );
}

function Methodology({ report }: { report: MiningReport }) {
  const method = report.methodology;
  const evaluation = report.classification.evaluation;
  const preprocessing = method?.preprocessing;
  const featureEngineering = method?.featureEngineering;
  const clustering = method?.clustering;
  const chosenK = report.clustering.selection?.chosenK ?? clustering?.bestK ?? report.clustering.bestK;
  const associationRules = method?.associationRules;
  const variants = evaluation?.variants ?? [];
  const bestModel = evaluation?.bestVariant?.algo ?? report.classification.bestModel;
  const bestVariant = evaluation?.bestVariant?.variant ?? report.classification.bestVariant;
  const bestVariantLabel = bestVariant === "cost" ? "cost-sensitive" : bestVariant;
  const phases: PhaseProps[] = [
    {
      number: 1,
      icon: Database,
      title: "Load and profile",
      sentence: "Load UCI dataset 350 and profile all client and payment fields.",
      chips: [["Rows", formatInt(report.dataset.totalRows)], ["Columns", formatInt(report.dataset.totalColumns)]],
    },
    {
      number: 2,
      icon: SlidersHorizontal,
      title: "Clean data",
      sentence: "Map category codes, remove duplicates, and flag IQR and Z-score outliers.",
      chips: [["Rows out", value(preprocessing?.rowsOut)], ["Duplicates", value(preprocessing?.duplicatesDropped)]],
    },
    {
      number: 3,
      icon: Boxes,
      title: "Engineer features",
      sentence: "Create utilization, pay ratio, delay, bill-trend, and risk-tier features.",
      chips: [["Derived", value(featureEngineering?.derivedFeatures?.length)], ["Target", "Default"]],
    },
    {
      number: 5,
      icon: BarChart3,
      title: "Classify",
      sentence: "Evaluate ten Weka model variants with cross-validation and holdout data.",
      chips: [["Variants", formatInt(variants.length)], ["Best", `${bestModel} (${bestVariantLabel})`]],
    },
    {
      number: 6,
      icon: GitBranch,
      title: "Cluster and detect anomalies",
      sentence: `Run K-means${chosenK != null ? ` with k=${chosenK}` : ""} and rank anomalies by centroid distance.`,
      chips: [["Chosen k", value(chosenK)], ["Clusters", formatInt(report.clustering.totalClusters)]],
    },
    {
      number: 7,
      icon: Filter,
      title: "Mine association rules",
      sentence: "Run Apriori passes for default and non-default client outcomes.",
      chips: [["Min support (default)", formatSupport(associationRules?.defaultPass?.finalSupport ?? associationRules?.defaultPass?.minSupport)], ["Min support (non-default)", formatSupport(associationRules?.nonDefaultPass?.minSupport)]],
    },
    {
      number: 10,
      icon: GitBranch,
      title: "Mine repayment sequences",
      sentence: "Run GSP to find repayment sequences that separate default outcomes.",
      chips: [["Method", "GSP"], ["Months", "April-September 2005"]],
    },
  ];

  return (
    <>
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="space-y-3 p-5">
          <Badge variant="outline" className="bg-muted">Data mining pipeline</Badge>
          <h1 className="text-2xl font-bold tracking-tight">From UCI data to a default decision</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            UCI Machine Learning Repository, dataset 350 (Yeh &amp; Lien, 2009), 30,000 clients, Taiwan, April-September 2005.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {phases.map((phase, index) => <Phase key={phase.number} {...phase} step={index + 1} />)}
      </div>

      <details className="rounded-lg border bg-card">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Model hyperparameters</summary>
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="border-b bg-muted/30 text-left text-muted-foreground"><th className="px-4 py-2 font-medium">Model</th><th className="px-4 py-2 font-medium">Variant</th><th className="px-4 py-2 font-medium">Parameters</th></tr></thead>
            <tbody>{variants.map((row, index) => <tr key={`${row.algo ?? "model"}-${row.variant ?? index}`} className="border-b last:border-0"><td className="px-4 py-2 font-medium">{row.algo ?? "Model"}</td><td className="px-4 py-2">{row.variant ?? "Variant"}</td><td className="px-4 py-2 text-muted-foreground">{row.hyperparameters?.summary ?? row.hyperparameters?.options ?? "Not available"}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </>
  );
}

interface PhaseProps {
  number: number;
  icon: LucideIcon;
  title: string;
  sentence: string;
  chips: Array<[string, string]>;
}

function Phase({ step, icon: Icon, title, sentence, chips }: PhaseProps & { step: number }) {
  return (
    <Card className="min-w-0 break-inside-avoid">
      <CardHeader className="pb-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden /></span><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Step {formatInt(step)}</span></div><CardTitle className="text-base">{title}</CardTitle></div></div></CardHeader>
      <CardContent className="space-y-4"><p className="text-sm">{sentence}</p><div className="flex flex-wrap gap-2">{chips.map(([label, chipValue]) => <DataChip key={`${label}-${chipValue}`} label={label} value={chipValue} />)}</div><Link href="/mining-report" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">View evidence</Link></CardContent>
    </Card>
  );
}

function value(input: string | number | null | undefined): string {
  return typeof input === "number" ? formatInt(input) : input ?? "n/a";
}

function formatSupport(input: number | null | undefined): string {
  return input == null ? "n/a" : formatPct(input);
}
