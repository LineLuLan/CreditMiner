"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatInt, formatPct } from "@/lib/utils";
import type { EvaluationVariant, MiningReport } from "@/types/api.types";
import { ModelComparisonChart } from "./ModelComparisonChart";
import { ReportDetails, ReportTable, Takeaway } from "./ReportPrimitives";
import { findBestVariant } from "./ExecutiveSummary";
import { modelLabel, variantLabel } from "./model-labels";

type MetricKey =
  | "model"
  | "variant"
  | "cvAccuracy"
  | "cvPrecision"
  | "cvRecall"
  | "cvF1"
  | "cvRocAuc"
  | "cvPrAuc"
  | "testAccuracy"
  | "testPrecision"
  | "testRecall"
  | "testF1"
  | "testRocAuc"
  | "testPrAuc";

export interface ComparisonRow {
  model: string;
  variant: string;
  cvAccuracy?: number | null;
  cvPrecision?: number | null;
  cvRecall?: number | null;
  cvF1?: number | null;
  cvRocAuc?: number | null;
  cvPrAuc?: number | null;
  testAccuracy?: number | null;
  testPrecision?: number | null;
  testRecall?: number | null;
  testF1?: number | null;
  testRocAuc?: number | null;
  testPrAuc?: number | null;
}

const COLUMNS: Array<{ key: MetricKey; label: string }> = [
  { key: "model", label: "Model" },
  { key: "variant", label: "Variant" },
  { key: "cvF1", label: "CV F1" },
  { key: "cvRocAuc", label: "CV ROC" },
  { key: "cvPrAuc", label: "CV PR" },
  { key: "cvAccuracy", label: "CV Acc." },
  { key: "cvPrecision", label: "CV Prec." },
  { key: "cvRecall", label: "CV Recall" },
  { key: "testF1", label: "Test F1" },
  { key: "testRocAuc", label: "Test ROC" },
  { key: "testPrAuc", label: "Test PR" },
  { key: "testAccuracy", label: "Test Acc." },
  { key: "testPrecision", label: "Test Prec." },
  { key: "testRecall", label: "Test Recall" },
];

export function ClassificationSection({ report }: { report: MiningReport }) {
  const split = report.classification.evaluation?.split ?? report.methodology?.split;
  const variants = report.classification.evaluation?.variants ?? [];
  const best = findBestVariant(report);
  const rows = buildRows(report, variants);
  // Prefer the selected cost variant, then CV F1 and ROC AUC; missing costs stay neutral.
  const costVariants = variants.filter((variant) => variant.variant === "cost").sort((a, b) => {
    if (a === best) return -1;
    if (b === best) return 1;
    return ((b.cv?.f1Default ?? -Infinity) - (a.cv?.f1Default ?? -Infinity))
      || ((b.cv?.rocAuc ?? -Infinity) - (a.cv?.rocAuc ?? -Infinity));
  });
  const costSummary = costVariants.find((variant) => variant.hyperparameters?.summary)?.hyperparameters?.summary;
  const costOptions = costVariants.find((variant) => variant.hyperparameters?.options)?.hyperparameters?.options;
  const costSentence = costSummary
    ? `Cost-sensitive learning: ${costSummary}`
    : costOptions
      ? `Cost-sensitive learning uses the cost matrix ${costOptions}.`
      : "Cost-sensitive learning uses the cost matrix recorded in each variant's hyperparameters.";

  return (
    <div id="section-5-1-improvements" className="scroll-mt-20 space-y-5">
      <div>
        <h4 className="report-heading text-lg font-semibold">Improvements</h4>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">SMOTE adds minority-class training examples [7]. {costSentence}</p>
      <Takeaway>
        {modelLabel(best?.algo ?? report.classification.bestModel, best?.variant ?? report.classification.bestVariant)} is the selected model. Section 6 explains the evaluation rule.
      </Takeaway>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Train rows" value={numberOrNA(split?.trainRows)} />
        <Metric label="Test rows" value={numberOrNA(split?.testRows)} />
        <Metric label="CV folds" value={numberOrNA(split?.cvFolds)} />
        <Metric label="Split seed" value={numberOrNA(split?.seed)} />
      </div>
      <ModelComparisonChart rows={rows} best={best} />
      <ReportDetails label="Model table">
        <p className="mb-4">
          SMOTE changes only training rows from {numberOrNA(split?.trainRows)} to{" "}
          {numberOrNA(split?.smoteTrainRows)}. Cost-sensitive models increase the penalty for missed
          defaults.
        </p>
        <p className="mb-4">
          The positive class is {split?.positiveClass ?? "Yes"}. The held-out test data stays
          unchanged.
        </p>
        <ModelComparisonTable rows={rows} best={best} sortable />
      </ReportDetails>
    </div>
  );
}

export function ModelComparisonTable({
  rows,
  best,
  sortable = false,
  appendix = false,
  tableId = "appendix-models",
  splitMetrics = false,
}: {
  rows: ComparisonRow[];
  best?: EvaluationVariant;
  sortable?: boolean;
  appendix?: boolean;
  tableId?: string;
  splitMetrics?: boolean;
}) {
  const [sortKey, setSortKey] = useState<MetricKey>("testF1");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const sorted = useMemo(() => {
    if (!sortable) return rows;
    return rows.slice().sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const result =
        typeof av === "string" || typeof bv === "string"
          ? String(av ?? "").localeCompare(String(bv ?? ""))
          : (av ?? -1) - (bv ?? -1);
      return direction === "asc" ? result : -result;
    });
  }, [rows, sortable, sortKey, direction]);

  function chooseSort(key: MetricKey) {
    if (!sortable) return;
    if (key === sortKey) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection(key === "model" || key === "variant" ? "asc" : "desc");
    }
  }

  const renderTable = (columns: typeof COLUMNS) => (
    <table className={cn("w-full text-[11px]", splitMetrics ? "table-fixed" : "min-w-[1180px]")}>
      <thead>
        <tr className="border-b bg-muted/30">
          {columns.map((column) => (
            <th key={column.key} className={cn("p-2 text-left font-medium", splitMetrics ? column.key === "model" && "w-[28%]" : "whitespace-nowrap")}>
              {sortable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1 text-[11px]"
                  onClick={() => chooseSort(column.key)}
                >
                  {column.label}
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              ) : (
                column.label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => {
          const isBest = row.model === best?.algo && row.variant === best?.variant;
          return (
            <tr
              key={`${row.model}-${row.variant}`}
              className={cn("border-b last:border-0", isBest && "bg-success/10")}
            >
              {columns.map((column) => {
                const value = column.key === "model" ? modelLabel(row.model, splitMetrics ? row.variant : undefined)
                  : column.key === "variant" ? variantLabel(row.variant) : row[column.key];
                return (
                  <td
                    key={column.key}
                    className={cn(
                      "p-2",
                      column.key === "model" && "font-semibold",
                      typeof value === "number" && "text-right tabular-nums",
                    )}
                  >
                    <span className="break-words" title={String(value ?? "n/a")}>
                      {typeof value === "number" ? formatPct(value) : (value ?? "n/a")}
                    </span>
                    {isBest && column.key === (splitMetrics ? "model" : "variant") ? (
                      <Badge variant="success-soft" className="ml-2">
                        best
                      </Badge>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  const table = splitMetrics ? <div className="space-y-4">
    <div><h4 className="px-2 pt-2 text-sm font-semibold">Cross-validation</h4>{renderTable(COLUMNS.filter((column) => column.key === "model" || column.key.startsWith("cv")))}</div>
    <div><h4 className="px-2 text-sm font-semibold">Holdout</h4>{renderTable(COLUMNS.filter((column) => column.key === "model" || column.key.startsWith("test")))}</div>
    <p className="px-2 pb-2 text-xs text-muted-foreground">CV = cross-validation; ROC = area under the receiver operating characteristic curve; PR = area under the precision-recall curve; Acc. = accuracy; Prec. = precision. All metrics are percentages.</p>
  </div> : renderTable(COLUMNS);

  return appendix ? (
    <ReportTable id={tableId} caption="Complete model comparison." allowPageBreak>
      {table}
    </ReportTable>
  ) : (
    <div className="overflow-x-auto rounded-lg border">{table}</div>
  );
}

export function comparisonRows(report: MiningReport): ComparisonRow[] {
  return buildRows(report, report.classification.evaluation?.variants ?? []);
}

function buildRows(report: MiningReport, variants: EvaluationVariant[]): ComparisonRow[] {
  return report.classification.modelMetrics.map((metric) => {
    const variant = variants.find(
      (item) => item.algo === metric.model && item.variant === metric.variant,
    );
    return {
      model: metric.model,
      variant: metric.variant,
      cvAccuracy: metric.cvAccuracy ?? variant?.cv?.accuracy,
      cvPrecision: variant?.cv?.precisionDefault,
      cvRecall: variant?.cv?.recallDefault,
      cvF1: metric.cvF1 ?? variant?.cv?.f1Default,
      cvRocAuc: metric.cvRocAuc ?? variant?.cv?.rocAuc,
      cvPrAuc: metric.cvPrAuc ?? variant?.cv?.prAuc,
      testAccuracy: metric.testAccuracy ?? variant?.test?.accuracy,
      testPrecision: metric.testPrecision ?? variant?.test?.precisionDefault,
      testRecall: metric.testRecall ?? variant?.test?.recallDefault,
      testF1: metric.testF1 ?? variant?.test?.f1Default,
      testRocAuc: metric.testRocAuc ?? variant?.test?.rocAuc,
      testPrAuc: metric.testPrAuc ?? variant?.test?.prAuc,
    };
  });
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

function numberOrNA(value: number | undefined): string {
  return value == null ? "n/a" : formatInt(value);
}
