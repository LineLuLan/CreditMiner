"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomer, useCustomers } from "@/hooks/useCustomers";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { formatInt, formatPct, formatUsd } from "@/lib/utils";
import type { CustomerSummary } from "@/types/api.types";

const ATTRITION_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "Existing Customer", label: "Existing only" },
  { value: "Attrited Customer", label: "Attrited only" },
];

const CLUSTER_OPTIONS = [
  { value: "all", label: "All clusters" },
  { value: "0", label: "C0 — Premium Loyal" },
  { value: "1", label: "C1 — At-Risk Mid-Tier" },
  { value: "2", label: "C2 — Low-Income Stable" },
];

const SORT_OPTIONS = [
  { value: "clientNum,asc", label: "ID ↑" },
  { value: "clientNum,desc", label: "ID ↓" },
  { value: "riskScore,desc", label: "Risk ↓" },
  { value: "riskScore,asc", label: "Risk ↑" },
  { value: "customerAge,asc", label: "Age ↑" },
  { value: "customerAge,desc", label: "Age ↓" },
];

export default function CustomersPage() {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [attritionFlag, setAttritionFlag] = React.useState("all");
  const [clusterId, setClusterId] = React.useState("all");
  const [sort, setSort] = React.useState("clientNum,asc");
  const [openId, setOpenId] = React.useState<number | null>(null);

  const params = React.useMemo(
    () => ({
      page,
      size,
      sort,
      ...(attritionFlag !== "all" ? { attritionFlag } : {}),
      ...(clusterId !== "all" ? { clusterId: Number(clusterId) } : {}),
    }),
    [page, size, sort, attritionFlag, clusterId],
  );

  const { data, isLoading, error, isFetching } = useCustomers(params);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  // Reset to page 1 on filter change.
  React.useEffect(() => {
    setPage(1);
  }, [attritionFlag, clusterId, sort, size]);

  return (
    <div className="flex flex-col">
      <Header title="Customers" />
      <div className="flex-1 space-y-4 p-6">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Filter label="Attrition">
                <Select value={attritionFlag} onValueChange={setAttritionFlag}>
                  <SelectTrigger aria-label="Filter by attrition" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTRITION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="Cluster">
                <Select value={clusterId} onValueChange={setClusterId}>
                  <SelectTrigger aria-label="Filter by cluster" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLUSTER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="Sort">
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger aria-label="Sort by" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
              <Filter label="Page size">
                <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
                  <SelectTrigger aria-label="Page size" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Filter>
            </div>
            <div className="text-sm text-muted-foreground">
              {data ? `${formatInt(data.total)} total` : isLoading ? "Loading…" : "—"}
              {isFetching && !isLoading ? " · refreshing…" : ""}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {error ? (
              <p className="p-6 text-sm text-destructive">
                {(error as { message?: string }).message ?? "Failed to load customers"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client #</TableHead>
                      <TableHead>Attrition</TableHead>
                      <TableHead className="text-right">Age</TableHead>
                      <TableHead className="hidden sm:table-cell">Gender</TableHead>
                      <TableHead className="hidden md:table-cell">Card</TableHead>
                      <TableHead className="hidden sm:table-cell">Tier</TableHead>
                      <TableHead className="text-right">Risk</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Cluster</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: size }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={9}>
                              <Skeleton className="h-6" />
                            </TableCell>
                          </TableRow>
                        ))
                      : data?.items.map((c) => (
                          <CustomerRow key={c.clientNum} c={c} onClick={() => setOpenId(c.clientNum)} />
                        ))}
                    {!isLoading && data && data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                          No customers match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {data ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {data.page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <CustomerDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactElement }) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {React.cloneElement(children, { id })}
    </div>
  );
}

function CustomerRow({ c, onClick }: { c: CustomerSummary; onClick: () => void }) {
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="font-mono text-xs">{c.clientNum}</TableCell>
      <TableCell>
        <Badge variant={c.attritionFlag === "Attrited Customer" ? "destructive" : "secondary"}>
          {c.attritionFlag === "Attrited Customer" ? "Attrited" : "Existing"}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{c.customerAge ?? "—"}</TableCell>
      <TableCell className="hidden sm:table-cell">{c.gender ?? "—"}</TableCell>
      <TableCell className="hidden md:table-cell">{c.cardCategory ?? "—"}</TableCell>
      <TableCell className="hidden sm:table-cell">{c.customerTier ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {c.riskScore != null ? c.riskScore.toFixed(2) : "—"}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {c.clusterId != null ? `C${c.clusterId}` : "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {c.isOutlier ? <Badge variant="outline" className="text-[10px]">outlier</Badge> : null}
          {c.isAnomaly ? <Badge variant="destructive" className="text-[10px]">anomaly</Badge> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function CustomerDetailDialog({
  id,
  onClose,
}: {
  id: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useCustomer(id ?? undefined);
  const open = id !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {id ? `Customer ${id}` : "Customer"}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : (
          <CustomerDetailGrid data={data as Record<string, unknown>} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const HUMANIZE: Record<string, string> = {
  clientNum: "Client #",
  attritionFlag: "Attrition",
  customerAge: "Age",
  gender: "Gender",
  dependentCount: "Dependents",
  educationLevel: "Education",
  maritalStatus: "Marital",
  incomeCategory: "Income",
  cardCategory: "Card",
  monthsOnBook: "Months on book",
  totalRelationshipCount: "Relationships",
  monthsInactive12Mon: "Months inactive (12mo)",
  contactsCount12Mon: "Contacts (12mo)",
  creditLimit: "Credit limit",
  totalRevolvingBal: "Revolving balance",
  avgOpenToBuy: "Open-to-buy",
  avgUtilizationRatio: "Avg utilization",
  totalAmtChngQ4Q1: "Amt Δ Q4/Q1",
  totalTransAmt: "Total trans amount",
  totalTransCt: "Total trans count",
  totalCtChngQ4Q1: "Ct Δ Q4/Q1",
  utilizationScore: "Utilization score",
  spendingIntensity: "Spending intensity",
  engagementScore: "Engagement score",
  customerValueScore: "Customer value",
  riskScore: "Risk score",
  customerTier: "Tier",
  isOutlier: "Outlier",
  isAnomaly: "Anomaly",
  clusterId: "Cluster",
};

const USD_KEYS = new Set(["creditLimit", "totalRevolvingBal", "avgOpenToBuy", "totalTransAmt"]);
const PCT_KEYS = new Set(["avgUtilizationRatio", "utilizationScore"]);

function CustomerDetailGrid({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {Object.entries(data).map(([key, value]) => {
        const label = HUMANIZE[key] ?? key;
        return (
          <div key={key} className="flex items-baseline justify-between border-b py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{formatValue(key, value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (USD_KEYS.has(key)) return formatUsd(value);
    if (PCT_KEYS.has(key)) return formatPct(value, 1);
    if (Number.isInteger(value) && Math.abs(value) < 1e9) return formatInt(value);
    return value.toString();
  }
  return String(value);
}
