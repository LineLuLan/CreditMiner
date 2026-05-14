"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRules } from "@/hooks/useRules";
import { formatPct } from "@/lib/utils";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "retention", label: "Retention only" },
  { value: "churn", label: "Churn only" },
];

export default function RulesPage() {
  const [minLift, setMinLift] = React.useState<number>(1.0);
  const [category, setCategory] = React.useState<string>("all");
  const minLiftId = React.useId();
  const categoryId = React.useId();
  const { data, isLoading, error } = useRules(
    minLift,
    category === "all" ? undefined : category,
  );

  // Sort by lift descending; tie-break by confidence.
  const sorted = React.useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => b.lift - a.lift || b.confidence - a.confidence),
    [data],
  );

  const scatterData = sorted.map((r) => ({
    support: Math.round(r.support * 1000) / 10,
    confidence: Math.round(r.confidence * 1000) / 10,
    lift: r.lift,
    name: r.lhs,
  }));

  return (
    <div className="flex flex-col">
      <Header title="Association Rules" />
      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardContent className="grid items-end gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor={minLiftId} className="text-xs text-muted-foreground">
                  Min lift
                </Label>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                  ≥ {minLift.toFixed(2)}
                </span>
              </div>
              <Input
                id={minLiftId}
                type="range"
                min={1.0}
                max={1.2}
                step={0.01}
                value={minLift}
                onChange={(e) => setMinLift(Number(e.target.value))}
                className="w-full"
                aria-valuemin={1}
                aria-valuemax={1.2}
                aria-valuenow={minLift}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1.00</span>
                <span>1.10</span>
                <span>1.20</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Retention rules cap at lift = 1/p(Existing) ≈ 1.19. Slide to 1.00 to see all 50.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={categoryId} className="text-xs text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={categoryId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground sm:text-right">
              {data ? `${data.length} rules` : isLoading ? "Loading…" : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support vs Confidence (size = lift)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80" />
            ) : error ? (
              <p className="text-sm text-destructive">
                {(error as { message?: string }).message ?? "Failed to load rules"}
              </p>
            ) : scatterData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rules match the current filter. Lower the min-lift threshold or change category.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 16, right: 16, bottom: 36, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="support"
                    name="Support"
                    unit="%"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis
                    type="number"
                    dataKey="confidence"
                    name="Confidence"
                    unit="%"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <ZAxis type="number" dataKey="lift" range={[60, 360]} name="Lift" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                      maxWidth: 320,
                    }}
                  />
                  <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>LHS (antecedent)</TableHead>
                      <TableHead className="hidden md:table-cell">RHS</TableHead>
                      <TableHead className="hidden sm:table-cell">Cat</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Support</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="text-right">Lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((r) => (
                      <TableRow key={r.ruleId}>
                        <TableCell className="text-xs text-muted-foreground">{r.ruleId}</TableCell>
                        <TableCell className="max-w-[260px] truncate font-mono text-xs" title={r.lhs}>
                          {r.lhs}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate font-mono text-xs md:table-cell" title={r.rhs}>
                          {r.rhs}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={r.category === "churn" ? "destructive" : "secondary"}>
                            {r.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {formatPct(r.support, 2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPct(r.confidence, 1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r.lift.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {sorted.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                          No rules match the current filter. Try lowering min-lift below {minLift.toFixed(2)} or switching category.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
