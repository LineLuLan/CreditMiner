"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClusterCustomers } from "@/hooks/useClusters";
import { formatInt, formatPct, formatMultiplier } from "@/lib/format";
import { featureLabel } from "@/lib/constants";
import { finiteNumber, safeRatio } from "@/components/clusters/clusters-view";

import { CHART_SEMANTIC, personaColor, personaIdentityColor } from "@/lib/chart-theme";

const PAGE_SIZE = 20;

interface Props {
  clusterId: number | null;
  personaName?: string;
  defaultRate?: number;
  defaultRateMultiplier?: number;
  baselineRate?: number;
  lowest?: boolean;
  onClose: () => void;
}

export function ClusterCustomersDialog({
  clusterId,
  personaName,
  defaultRate,
  defaultRateMultiplier,
  baselineRate,
  lowest = false,
  onClose,
}: Props) {
  const [page, setPage] = React.useState(1);
  const open = clusterId !== null;
  const { data, isLoading, error } = useClusterCustomers(clusterId ?? -1, page, PAGE_SIZE);

  // Reset to page 1 when the cluster changes.
  React.useEffect(() => {
    setPage(1);
  }, [clusterId]);

  const color = personaColor(defaultRateMultiplier ?? safeRatio(defaultRate, baselineRate), lowest);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] min-w-0 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: personaIdentityColor(personaName, defaultRateMultiplier ?? safeRatio(defaultRate, baselineRate)) }} />
            {personaName ? personaName : `Cluster ${clusterId}`}
            {data ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatInt(data.total)} clients
              </span>
            ) : null}
          </DialogTitle>
          {finiteNumber(defaultRate) ? (
            <Badge
              variant={color === CHART_SEMANTIC.danger ? "danger" : color === CHART_SEMANTIC.warning ? "warning" : "secondary"}
              style={{ borderColor: color }}
              className={color === CHART_SEMANTIC.warning ? "w-fit bg-warning/15 text-foreground hover:bg-warning/15" : "w-fit"}
            >
              {formatPct(defaultRate)} default {"\u00b7"}{" "}
              {formatMultiplier(defaultRateMultiplier ?? safeRatio(defaultRate, baselineRate))}
            </Badge>
          ) : null}
        </DialogHeader>

        {error ? (
          <p className="text-sm text-danger">
            {(error as { message?: string }).message ?? "Failed to load cluster clients"}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client #</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">{featureLabel("AGE")}</TableHead>
                  <TableHead>Risk tier</TableHead>
                  <TableHead className="text-right">{featureLabel("PAY_RATIO")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-5" />
                        </TableCell>
                      </TableRow>
                    ))
                  : data?.items.map((c) => (
                      <TableRow key={c.clientId}>
                        <TableCell className="font-mono text-xs">{formatInt(c.clientId)}</TableCell>
                        <TableCell>
                          <Badge variant={c.defaultFlag === "Yes" ? "danger" : "secondary"}>
                            {c.defaultFlag}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInt(c.age)}
                        </TableCell>
                        <TableCell>{c.riskTier}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPct(c.payRatio)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>

            {data ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  Page {formatInt(data.page)} / {formatInt(totalPages)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
