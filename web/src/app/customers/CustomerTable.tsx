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
import type { CustomerSummary } from "@/types/api.types";

export function CustomerTable({
  errorMessage,
  isLoading,
  size,
  items,
  onSelect,
}: {
  errorMessage?: string;
  isLoading: boolean;
  size: number;
  items?: CustomerSummary[];
  onSelect: (customerId: number) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {errorMessage ? (
          <p className="p-6 text-sm text-destructive">{errorMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Churn</TableHead>
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
                  ? Array.from({ length: size }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-6" />
                        </TableCell>
                      </TableRow>
                    ))
                  : items?.map((customer) => (
                      <CustomerRow
                        key={customer.clientNum}
                        customer={customer}
                        onClick={() => onSelect(customer.clientNum)}
                      />
                    ))}
                {!isLoading && items && items.length === 0 ? (
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
  );
}

function CustomerRow({ customer, onClick }: { customer: CustomerSummary; onClick: () => void }) {
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="font-mono text-xs">{customer.clientNum}</TableCell>
      <TableCell>
        <Badge
          variant={customer.attritionFlag === "Attrited Customer" ? "destructive" : "secondary"}
        >
          {customer.attritionFlag === "Attrited Customer" ? "Churned" : "Active"}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{customer.customerAge ?? "n/a"}</TableCell>
      <TableCell className="hidden sm:table-cell">{customer.gender ?? "n/a"}</TableCell>
      <TableCell className="hidden md:table-cell">{customer.cardCategory ?? "n/a"}</TableCell>
      <TableCell className="hidden sm:table-cell">{customer.customerTier ?? "n/a"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {customer.riskScore != null ? <RiskValue value={customer.riskScore} /> : "n/a"}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {customer.clusterId != null ? `C${customer.clusterId}` : "n/a"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {customer.isOutlier ? <Badge variant="outline" className="text-[10px]">outlier</Badge> : null}
          {customer.isAnomaly ? <Badge variant="destructive" className="text-[10px]">anomaly</Badge> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function RiskValue({ value }: { value: number }) {
  const tone =
    value < 0.35
      ? "bg-muted text-muted-foreground"
      : value <= 0.5
        ? "bg-warning/20 text-warning-foreground ring-warning/30"
        : "bg-destructive/15 text-destructive ring-destructive/30";
  const label = value < 0.35 ? "Low" : value <= 0.5 ? "Watch" : "High";

  return (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}
      aria-label={`${label} risk, score ${value.toFixed(2)}`}
    >
      {value.toFixed(2)}
    </span>
  );
}
