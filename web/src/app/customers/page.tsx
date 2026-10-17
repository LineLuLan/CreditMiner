"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useClusters } from "@/hooks/useClusters";
import type { Cluster } from "@/types/api.types";
import { useOverview } from "@/hooks/useOverview";
import { useCustomer, useCustomers } from "@/hooks/useCustomers";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, featureLabel, EDUCATION_LABELS, MARRIAGE_LABELS } from "@/lib/constants";
import { formatDecimal, formatInt, formatNt, formatPct } from "@/lib/format";
import { CustomerTable } from "./CustomerTable";

const DEFAULT_OPTIONS = [
  { value: "all", label: "All clients" },
  { value: "No", label: "Non-default only" },
  { value: "Yes", label: "Default only" },
];

const SORT_OPTIONS = [
  { value: "clientId,asc", label: "ID ascending" },
  { value: "clientId,desc", label: "ID descending" },
  { value: "payRatio,desc", label: `${featureLabel("PAY_RATIO")} descending` },
  { value: "payRatio,asc", label: `${featureLabel("PAY_RATIO")} ascending` },
  { value: "age,asc", label: "Age ascending" },
  { value: "age,desc", label: "Age descending" },
];

export default function CustomersPage() {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [defaultFlag, setDefaultFlag] = React.useState<"all" | "No" | "Yes">("all");
  const [clusterId, setClusterId] = React.useState("all");
  const [sort, setSort] = React.useState("clientId,asc");
  const [openId, setOpenId] = React.useState<number | null>(null);

  const params = React.useMemo(
    () => ({
      page,
      size,
      sort,
      ...(defaultFlag !== "all" ? { defaultFlag } : {}),
      ...(clusterId !== "all" ? { clusterId: Number(clusterId) } : {}),
    }),
    [page, size, sort, defaultFlag, clusterId],
  );

  const { data, isLoading, error, isFetching } = useCustomers(params);
  const { data: clusters } = useClusters();
  const { data: overview } = useOverview();
  const { data: anomalies, error: anomalyError } = useAnomalies();
  const clusterOptions = [
    { value: "all", label: "All personas" },
    ...(clusters ?? []).map((cluster) => ({
      value: String(cluster.clusterId),
      label: cluster.displayName ?? cluster.personaName,
    })),
  ];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  React.useEffect(() => setPage(1), [defaultFlag, clusterId, sort, size]);

  return (
    <div className="flex min-w-0 flex-col">
      <Header title="Customers" />
      <div className="min-w-0 flex-1 space-y-4 p-4 xl:p-5">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Filter label="Default status">
                <Select
                  value={defaultFlag}
                  onValueChange={(value) => setDefaultFlag(value as "all" | "No" | "Yes")}
                >
                  <SelectTrigger aria-label="Filter by default status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="Persona">
                <Select value={clusterId} onValueChange={setClusterId}>
                  <SelectTrigger
                    aria-label="Filter by persona"
                    className="w-full min-w-0 [&>span]:truncate"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {clusterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="Sort">
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger aria-label="Sort clients" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="Page size">
                <Select value={String(size)} onValueChange={(value) => setSize(Number(value))}>
                  <SelectTrigger aria-label="Page size" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">Quick filter</span>
              <Button
                type="button"
                size="sm"
                variant={defaultFlag === "Yes" ? "secondary" : "outline"}
                aria-pressed={defaultFlag === "Yes"}
                onClick={() => setDefaultFlag("Yes")}
              >
                Default only
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {data ? `${formatInt(data.total)} total` : isLoading ? "Loading..." : "n/a"}
              {isFetching && !isLoading ? " \u00b7 refreshing..." : ""}
            </div>
          </CardContent>
        </Card>

        <CustomerTable
          errorMessage={
            error
              ? ((error as { message?: string }).message ?? "Failed to load clients")
              : undefined
          }
          isLoading={isLoading}
          size={size}
          items={data?.items}
          clusters={clusters}
          anomalies={anomalyError ? undefined : anomalies}
          baselineRate={overview?.defaultRate}
          onSelect={setOpenId}
        />

        {anomalyError ? (
          <p className="text-xs text-danger">
            Ranked anomaly evidence is unavailable. Outlier badges are hidden.
          </p>
        ) : anomalies ? (
          <p className="text-xs text-muted-foreground">
            Outlier badges mark the {formatInt(anomalies.length)} clients flagged by the anomaly check.
          </p>
        ) : null}

        {data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Page {formatInt(data.page)} / {formatInt(totalPages)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <CustomerDetailDialog id={openId} clusters={clusters} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactElement }) {
  const id = React.useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {React.cloneElement(children, { id })}
    </div>
  );
}

function CustomerDetailDialog({
  id,
  clusters,
  onClose,
}: {
  id: number | null;
  clusters?: Cluster[];
  onClose: () => void;
}) {
  const { data, isLoading } = useCustomer(id ?? undefined);
  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{id ? `Client ${id}` : "Client"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-6" />
            ))}
          </div>
        ) : (
          <CustomerDetailGrid data={data as Record<string, unknown>} clusters={clusters} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const HUMANIZE: Record<string, string> = {
  clientId: "Client ID",
  limitBal: featureLabel("LIMIT_BAL"),
  sex: "Sex",
  education: "Education",
  marriage: "Marriage",
  age: featureLabel("AGE"),
  pay1: "Repayment status - Sep 2005",
  pay2: "Repayment status - Aug 2005",
  pay3: "Repayment status - Jul 2005",
  pay4: "Repayment status - Jun 2005",
  pay5: "Repayment status - May 2005",
  pay6: "Repayment status - Apr 2005",
  billAmt1: "Bill amount - Sep 2005",
  billAmt2: "Bill amount - Aug 2005",
  billAmt3: "Bill amount - Jul 2005",
  billAmt4: "Bill amount - Jun 2005",
  billAmt5: "Bill amount - May 2005",
  billAmt6: "Bill amount - Apr 2005",
  payAmt1: "Payment amount - Sep 2005",
  payAmt2: "Payment amount - Aug 2005",
  payAmt3: "Payment amount - Jul 2005",
  payAmt4: "Payment amount - Jun 2005",
  payAmt5: "Payment amount - May 2005",
  payAmt6: "Payment amount - Apr 2005",
  defaultFlag: "Default next month",
  utilization1: featureLabel("UTILIZATION_1"),
  avgUtilization: featureLabel("AVG_UTILIZATION"),
  payRatio: featureLabel("PAY_RATIO"),
  monthsDelayed: featureLabel("MONTHS_DELAYED"),
  maxDelay: featureLabel("MAX_DELAY"),
  billTrend: featureLabel("BILL_TREND"),
  riskTier: "Risk tier",
  isOutlier: "Outlier",
  isAnomaly: "Anomaly",
  centroidDistance: "Centroid distance",
  clusterId: "Persona",
};

const NT_KEYS = new Set([
  "limitBal",
  ...Array.from({ length: 6 }, (_, index) => `billAmt${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `payAmt${index + 1}`),
]);
const PCT_KEYS = new Set(["utilization1", "avgUtilization", "payRatio", "billTrend"]);
const STATUS_KEYS = new Set(Array.from({ length: 6 }, (_, index) => `pay${index + 1}`));

function CustomerDetailGrid({
  data,
  clusters,
}: {
  data: Record<string, unknown>;
  clusters?: Cluster[];
}) {
  const cluster = clusters?.find((item) => item.clusterId === data.clusterId);
  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          className="flex min-w-0 items-baseline justify-between gap-4 border-b py-1.5 text-sm"
        >
          <span className="text-muted-foreground">{HUMANIZE[key] ?? key}</span>
          <span className="min-w-0 break-words text-right font-medium">
            {key === "clusterId" && cluster
              ? (cluster.displayName ?? cluster.personaName)
              : formatValue(key, value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (NT_KEYS.has(key)) return formatNt(value);
    if (PCT_KEYS.has(key)) return formatPct(value, 1);
    if (STATUS_KEYS.has(key)) return repaymentStatus(value);
    if (Number.isInteger(value)) return formatInt(value);
    return formatDecimal(value, 4);
  }
  if (key === "education") return EDUCATION_LABELS[String(value)] ?? String(value);
  if (key === "marriage") return MARRIAGE_LABELS[String(value)] ?? String(value);
  return String(value);
}

function repaymentStatus(value: number): string {
  if (value === -2) return "No use";
  if (value === -1) return "Paid in full";
  if (value === 0) return "Revolving";
  return `${value} ${value === 1 ? "month" : "months"} late`;
}
