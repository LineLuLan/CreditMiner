"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  CHART_AXIS_TICK,
  CHART_TOOLTIP_ITEM_STYLE,
  chartTooltipContentStyle,
} from "@/components/charts/chart-theme";
import { useRules } from "@/hooks/useRules";
import { formatInt, formatPct } from "@/lib/utils";
import type { Rule } from "@/types/api.types";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "retention", label: "Retention only" },
  { value: "churn", label: "Churn only" },
];

const RULE_FIELD_LABELS: Record<string, string> = {
  Attrition_Flag: "Attrition status",
  Avg_Utilization_Ratio: "Utilization",
  Card_Category: "Card tier",
  Credit_Limit: "Credit limit",
  Gender: "Gender",
  Total_Revolving_Bal: "Revolving balance",
  Total_Relationship_Count: "Relationship count",
  Total_Trans_Amt: "Transaction amount",
  Total_Trans_Ct: "Transaction count",
};

export default function RulesPage() {
  const [minLift, setMinLift] = React.useState<number>(1.0);
  const [category, setCategory] = React.useState<string>("all");
  const minLiftId = React.useId();
  const categoryId = React.useId();
  const { data, isLoading, error } = useRules(minLift, category === "all" ? undefined : category);

  const sorted = React.useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => b.support - a.support || b.lift - a.lift || b.confidence - a.confidence),
    [data],
  );

  const summary = React.useMemo(() => summarizeRules(sorted), [sorted]);
  const supportData = React.useMemo(
    () =>
      sorted.slice(0, 10).map((rule, index) => ({
        rank: `#${index + 1}`,
        supportPct: Math.round(rule.support * 10000) / 100,
        lift: rule.lift,
        rule: describeRule(rule).headline,
      })),
    [sorted],
  );
  const conditionData = React.useMemo(() => conditionFrequency(sorted).slice(0, 8), [sorted]);

  return (
    <div className="flex flex-col">
      <Header title="Association Rules" />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <Card>
          <CardContent className="grid items-end gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor={minLiftId} className="text-xs text-muted-foreground">
                  Min lift
                </Label>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                  &gt;= {minLift.toFixed(2)}
                </span>
              </div>
              <Input
                id={minLiftId}
                type="range"
                min={1.0}
                max={1.2}
                step={0.01}
                value={minLift}
                onChange={(event) => setMinLift(Number(event.target.value))}
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
                Retention rules cap around lift 1.19. Slide to 1.00 to show all 50 rules.
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
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground sm:text-right">
              {data ? `${data.length} rules` : isLoading ? "Loading..." : "-"}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-destructive">
                {(error as { message?: string }).message ?? "Failed to load rules"}
              </p>
            </CardContent>
          </Card>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                No rules match the current filter. Lower the min-lift threshold or change category.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Rules shown"
                value={formatInt(sorted.length)}
                detail="After current filters"
              />
              <MetricCard
                label="Retention rules"
                value={formatInt(summary.retention)}
                detail="Rules whose RHS keeps existing customers"
              />
              <MetricCard
                label="Confidence"
                value={formatPct(summary.avgConfidence)}
                detail="Flat at 100%, so confidence scatter adds little signal"
              />
              <MetricCard
                label="Max lift"
                value={summary.maxLift.toFixed(2)}
                detail="Use lift/support ranking for practical comparison"
              />
            </section>

            <section className="grid items-start gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top rules by support</CardTitle>
                  <CardDescription>
                    Confidence is flat, so support is the clearer signal for which mined patterns
                    affect more customers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={supportData}
                      layout="vertical"
                      margin={{ top: 8, right: 20, left: 12, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" unit="%" tick={CHART_AXIS_TICK} />
                      <YAxis type="category" dataKey="rank" width={36} tick={CHART_AXIS_TICK} />
                      <Tooltip
                        content={<RuleSupportTooltip />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
                      />
                      <Bar
                        dataKey="supportPct"
                        name="Support"
                        fill="hsl(var(--primary))"
                        maxBarSize={24}
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Most repeated rule conditions</CardTitle>
                  <CardDescription>
                    Shows what Apriori repeatedly discovered across the selected rule set.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conditionData.map((condition) => (
                    <ConditionRow
                      key={`${condition.label}-${condition.value}`}
                      condition={condition}
                      max={conditionData[0]?.count ?? 1}
                    />
                  ))}
                </CardContent>
              </Card>
            </section>
          </>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ranked rule evidence</CardTitle>
            <CardDescription>
              Business-readable rules with support, confidence, and lift retained for reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {sorted.map((rule, index) => (
                  <RuleCard key={rule.ruleId} rule={rule} rank={index + 1} />
                ))}
                {sorted.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground md:col-span-2">
                    No rules match the current filter. Try lowering min-lift below{" "}
                    {minLift.toFixed(2)} or switching category.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function RuleCard({ rule, rank }: { rule: Rule; rank: number }) {
  const label = describeRule(rule);

  return (
    <div className="rounded-lg border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">#{rank}</Badge>
            <Badge variant={rule.category === "churn" ? "destructive" : "default"}>
              {rule.category}
            </Badge>
          </div>
          <p className="mt-2 font-semibold leading-5">{label.headline}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {label.conditions.map((condition) => (
          <span
            key={condition.raw}
            className="rounded-md bg-muted/45 px-2 py-1 text-xs text-muted-foreground"
            title={condition.raw}
          >
            {condition.label}:{" "}
            <span className="font-medium text-foreground">{condition.value}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="Support" value={formatPct(rule.support, 2)} />
        <MiniMetric label="Confidence" value={formatPct(rule.confidence)} />
        <MiniMetric label="Lift" value={rule.lift.toFixed(2)} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/25 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ConditionRow({
  condition,
  max,
}: {
  condition: { label: string; value: string; count: number };
  max: number;
}) {
  const pct = max > 0 ? (condition.count / max) * 100 : 0;

  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{condition.value}</p>
          <p className="text-xs text-muted-foreground">{condition.label}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{condition.count}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RuleSupportTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { rule: string; supportPct: number; lift: number; rank: string } }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div style={chartTooltipContentStyle({ maxWidth: 320 })}>
      <p className="mb-2 text-xs font-semibold">{row.rank}</p>
      <p className="text-xs leading-5">{row.rule}</p>
      <div style={CHART_TOOLTIP_ITEM_STYLE}>
        Support {row.supportPct.toFixed(2)}% · Lift {row.lift.toFixed(2)}
      </div>
    </div>
  );
}

function summarizeRules(rules: Rule[]) {
  const retention = rules.filter((rule) => rule.category === "retention").length;
  const avgConfidence =
    rules.length > 0 ? rules.reduce((sum, rule) => sum + rule.confidence, 0) / rules.length : 0;
  const maxLift = rules.length > 0 ? Math.max(...rules.map((rule) => rule.lift)) : 0;
  return { retention, avgConfidence, maxLift };
}

function conditionFrequency(rules: Rule[]) {
  const counts = new Map<string, { label: string; value: string; count: number }>();

  for (const rule of rules) {
    for (const condition of parseRuleSide(rule.lhs)) {
      const key = `${condition.label}:${condition.value}`;
      const existing = counts.get(key);
      counts.set(key, {
        label: condition.label,
        value: condition.value,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function describeRule(rule: Rule) {
  const conditions = parseRuleSide(rule.lhs);
  const outcome = parseRuleSide(rule.rhs)[0];
  const outcomeValue = outcome ? outcome.value : friendlyRuleValue(rule.rhs);

  return {
    headline: `${conditions.map((condition) => condition.value).join(" + ")} -> ${outcomeValue}`,
    conditions,
  };
}

function parseRuleSide(value: string) {
  return value
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return {
          raw: part,
          label: "Condition",
          value: friendlyRuleValue(part),
        };
      }

      const field = part.slice(0, separatorIndex).trim();
      const rawValue = part.slice(separatorIndex + 1).trim();

      return {
        raw: part,
        label: RULE_FIELD_LABELS[field] ?? field.replaceAll("_", " "),
        value: friendlyRuleValue(rawValue, field),
      };
    });
}

function friendlyRuleValue(value: string, field?: string) {
  const cleanValue = value.trim().replace(/^['"]|['"]$/g, "");

  if (field === "Gender") {
    if (cleanValue === "F") return "Female";
    if (cleanValue === "M") return "Male";
  }

  if (field === "Card_Category" && cleanValue === "Blue") return "Blue card";
  if (cleanValue === "Existing Customer") return "Existing customer";
  if (cleanValue === "Attrited Customer") return "Attrited customer";

  const upperBound = cleanValue.match(/^\(-inf-([\d.]+)\]$/);
  if (upperBound) return `up to ${formatRuleNumber(upperBound[1])}`;

  const lowerBound = cleanValue.match(/^\(([\d.]+)-inf\)$/);
  if (lowerBound) return `above ${formatRuleNumber(lowerBound[1])}`;

  const range = cleanValue.match(/^\(([\d.]+)-([\d.]+)\]$/);
  if (range) return `${formatRuleNumber(range[1])} to ${formatRuleNumber(range[2])}`;

  return cleanValue.replaceAll("_", " ");
}

function formatRuleNumber(value: string) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: numericValue >= 100 ? 0 : 1,
  }).format(numericValue);
}
