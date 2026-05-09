"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatInt } from "@/lib/utils";

const PAGE_SIZE = 20;

interface Props {
  clusterId: number | null;
  personaName?: string;
  onClose: () => void;
}

export function ClusterCustomersDialog({ clusterId, personaName, onClose }: Props) {
  const [page, setPage] = React.useState(1);
  const open = clusterId !== null;
  const { data, isLoading, error } = useClusterCustomers(
    clusterId ?? -1,
    page,
    PAGE_SIZE,
  );

  // Reset to page 1 when the cluster changes.
  React.useEffect(() => {
    setPage(1);
  }, [clusterId]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {personaName ? `${personaName} (Cluster ${clusterId})` : `Cluster ${clusterId}`}
            {data ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatInt(data.total)} customers
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load cluster customers"}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client #</TableHead>
                  <TableHead>Attrition</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
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
                      <TableRow key={c.clientNum}>
                        <TableCell className="font-mono text-xs">{c.clientNum}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.attritionFlag === "Attrited Customer"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {c.attritionFlag === "Attrited Customer" ? "Attrited" : "Existing"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.customerAge ?? "—"}
                        </TableCell>
                        <TableCell>{c.cardCategory ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.riskScore != null ? c.riskScore.toFixed(2) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>

            {data ? (
              <div className="mt-4 flex items-center justify-between text-sm">
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
