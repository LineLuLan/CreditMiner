"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDecimal, formatInt, formatRatio } from "@/lib/format";
import { clusterColor } from "@/lib/chart-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Anomaly, Cluster, CustomerSummary } from "@/types/api.types";

export function CustomerTable({
  errorMessage,
  isLoading,
  size,
  items,
  onSelect,
  clusters,
  anomalies,
  baselineRate,
}: {
  errorMessage?: string;
  isLoading: boolean;
  size: number;
  items?: CustomerSummary[];
  clusters?: Cluster[];
  anomalies?: Anomaly[];
  baselineRate?: number;
  onSelect: (customerId: number) => void;
}) {
  const anomalyByClient = new Map(anomalies?.map((anomaly) => [anomaly.clientId, anomaly]));
  const clusterById = new Map(clusters?.map((cluster) => [cluster.clusterId, cluster]));

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="min-w-0">
        <CardContent className="p-0">
          {errorMessage ? (
            <p className="p-6 text-sm text-danger">{errorMessage}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                    <TableHead className="hidden sm:table-cell">Sex</TableHead>
                    <TableHead className="hidden md:table-cell">Education</TableHead>
                    <TableHead className="hidden sm:table-cell">Risk tier</TableHead>
                    <TableHead className="text-right">Pay ratio</TableHead>
                    <TableHead className="hidden md:table-cell">Cluster</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: size }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={9}>
                            <Skeleton className="h-6" />
                          </TableCell>
                        </TableRow>
                      ))
                    : items?.map((customer) => (
                        <CustomerRow
                          key={customer.clientId}
                          customer={customer}
                          anomaly={anomalyByClient.get(customer.clientId)}
                          cluster={
                            customer.clusterId == null
                              ? undefined
                              : clusterById.get(customer.clusterId)
                          }
                          baselineRate={baselineRate}
                          onClick={() => onSelect(customer.clientId)}
                        />
                      ))}
                  {!isLoading && items && items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No clients match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function CustomerRow({
  customer,
  anomaly,
  cluster,
  baselineRate,
  onClick,
}: {
  customer: CustomerSummary;
  anomaly?: Anomaly;
  cluster?: Cluster;
  baselineRate?: number;
  onClick: () => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell>{formatInt(customer.clientId)}</TableCell>
      <TableCell>
        <Badge variant={customer.defaultFlag === "Yes" ? "destructive" : "secondary"}>
          {customer.defaultFlag}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatInt(customer.age)}</TableCell>
      <TableCell className="hidden sm:table-cell">{customer.sex}</TableCell>
      <TableCell className="hidden md:table-cell">{customer.education}</TableCell>
      <TableCell className="hidden sm:table-cell">{customer.riskTier}</TableCell>
      <TableCell className="text-right tabular-nums">{formatRatio(customer.payRatio)}</TableCell>
      <TableCell className="hidden md:table-cell">
        {cluster ? (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: clusterColor(cluster.defaultRate, baselineRate) }}
            />
            {cluster.displayName ?? cluster.personaName}
          </span>
        ) : (
          "n/a"
        )}
      </TableCell>
      <TableCell>
        {anomaly ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-full border border-danger px-2 py-0.5 text-[10px] font-semibold text-danger"
                aria-label={`Outlier, score ${formatDecimal(anomaly.score, 4)}`}
                onClick={(event) => event.stopPropagation()}
              >
                outlier
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Score: {formatDecimal(anomaly.score, 4)}</p>
              <p>{anomaly.reason}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
