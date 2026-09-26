"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataChip } from "@/components/ui/data-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as Hint, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CHART_AXIS_TICK,
  CHART_SEMANTIC,
  CHART_TOOLTIP_ITEM_STYLE,
  chartTooltipContentStyle,
} from "@/components/charts/chart-theme";
import { useRules } from "@/hooks/useRules";
import { describeRule, parseRuleSide } from "@/lib/rules-format";
import { formatInt, formatPct } from "@/lib/utils";
import type { Rule } from "@/types/api.types";

type RuleCategory = "churn" | "retention" | "all";
const CATEGORY_OPTIONS: Array<{ value: RuleCategory; label: string }> = [
  { value: "churn", label: "Churn rules" },
  { value: "retention", label: "Retention rules" },
  { value: "all", label: "All" },
];

export default function RulesPage() {
  const [minLift, setMinLift] = React.useState(1);
  const [category, setCategory] = React.useState<RuleCategory>("churn");
  const minLiftId = React.useId();
  const allRulesQuery = useRules(1);
  const { data, isLoading, error } = useRules(minLift, category === "all" ? undefined : category);
  const allRules = React.useMemo(() => allRulesQuery.data ?? [], [allRulesQuery.data]);
  const maxLift = React.useMemo(() => getSliderMax(allRules), [allRules]);

  React.useEffect(() => setMinLift((current) => Math.min(current, maxLift)), [maxLift]);

  const sorted = React.useMemo(() => {
    const rules = (data ?? []).slice();
    return category === "retention"
      ? rules.sort((a, b) => b.support - a.support || b.lift - a.lift)
      : rules.sort((a, b) => b.lift - a.lift || b.support - a.support);
  }, [category, data]);
  const summary = React.useMemo(() => summarizeRules(sorted), [sorted]);
  const rankByLift = category !== "retention";
  const rankingData = React.useMemo(
    () =>
      sorted.slice(0, 10).map((rule) => {
        const description = describeRule(rule);
        const conditions = description.conditions.map((item) => item.value).join(", ");
        return {
          conditions,
          label: truncate(conditions),
          value: rankByLift ? rule.lift : Math.round(rule.support * 10000) / 100,
          support: Math.round(rule.support * 10000) / 100,
          lift: rule.lift,
        };
      }),
    [rankByLift, sorted],
  );
  const conditionData = React.useMemo(() => conditionFrequency(sorted).slice(0, 8), [sorted]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-w-0 flex-col">
        <Header title="Association Rules" />
        <div className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
          <RuleGlossary />
          <Card>
            <CardContent className="space-y-5 pt-6">
              <Tabs value={category} onValueChange={(next) => setCategory(next as RuleCategory)}>
                <TabsList className="grid h-auto w-full grid-cols-3" aria-label="Rule category">
                  {CATEGORY_OPTIONS.map((option) => (
                    <TabsTrigger key={option.value} value={option.value} className="gap-1 px-1.5 text-xs sm:text-sm">
                      <span className="truncate">{option.label}</span>
                      <Badge variant="secondary" className="px-1.5 tabular-nums">
                        {allRulesQuery.isLoading ? "..." : getCategoryCount(allRules, option.value)}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={minLiftId} className="text-xs text-muted-foreground">Min lift</Label>
                    <DataChip value={`>= ${minLift.toFixed(2)}`} />
                  </div>
                  <Input
                    id={minLiftId}
                    type="range"
                    min={1}
                    max={maxLift}
                    step={0.01}
                    value={minLift}
                    onChange={(event) => setMinLift(Number(event.target.value))}
                    disabled={maxLift === 1}
                    aria-valuemin={1}
                    aria-valuemax={maxLift}
                    aria-valuenow={minLift}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {data ? `${data.length} rules` : isLoading ? "Loading..." : "n/a"}
                </p>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Skeleton className="h-80" />
          ) : error ? (
            <Card><CardContent className="p-6 text-sm text-destructive">{(error as { message?: string }).message ?? "Rules unavailable"}</CardContent></Card>
          ) : sorted.length === 0 ? (
            <Card><CardHeader><CardTitle className="text-base">No matching rules</CardTitle><CardDescription>Lower the minimum lift.</CardDescription></CardHeader></Card>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Rules shown" value={formatInt(sorted.length)} />
                <Metric label="Churn rules" value={formatInt(summary.churn)} />
                <Metric label="Confidence" value={formatPct(summary.avgConfidence)} />
                <Metric label="Max lift" value={summary.maxLift.toFixed(2)} />
              </section>
              <section className="grid min-w-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <RankingChart data={rankingData} rankByLift={rankByLift} />
                <ConditionList conditions={conditionData} />
              </section>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ranked rule evidence</CardTitle>
                  <CardDescription>Conditions and measured outcomes.</CardDescription>
                </CardHeader>
                <CardContent><RuleGrid rules={sorted} category={category} /></CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function RuleGlossary() {
  const terms = [
    ["Support", "Share of customers that match the full rule."],
    ["Confidence", "Outcome rate for customers that match the conditions."],
    ["Lift", "Outcome rate divided by its base rate."],
  ] as const;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-2 p-4">
        {terms.map(([term, definition]) => (
          <Hint key={term}>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {term}<Info className="h-4 w-4 text-muted-foreground" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent>{definition}</TooltipContent>
          </Hint>
        ))}
        <details className="ml-auto rounded-md border bg-background">
          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Details</summary>
          <div className="max-w-xl space-y-2 border-t p-4 text-sm text-muted-foreground">
            <p>Common outcomes have a lower lift ceiling.</p>
            <p>Churn rules rank by lift because lift corrects for the churn base rate.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{value}</p></CardContent></Card>;
}

type RankingRow = { conditions: string; label: string; value: number; support: number; lift: number };

function RankingChart({ data, rankByLift }: { data: RankingRow[]; rankByLift: boolean }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3"><CardTitle className="text-base">Top rules by {rankByLift ? "lift" : "support"}</CardTitle></CardHeader>
      <CardContent>
        <div role="img" aria-label={`Top rules by ${rankByLift ? "lift" : "support"}`}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" unit={rankByLift ? undefined : "%"} tick={CHART_AXIS_TICK} />
              <YAxis type="category" dataKey="label" width={148} tick={{ ...CHART_AXIS_TICK, fontSize: 11 }} />
              <Tooltip content={<RuleTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} />
              <Bar dataKey="value" name={rankByLift ? "Lift" : "Support"} fill={CHART_SEMANTIC.primary} maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ConditionList({ conditions }: { conditions: Array<{ label: string; value: string; count: number }> }) {
  const max = conditions[0]?.count ?? 1;
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Repeated conditions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {conditions.map((condition) => (
          <div key={`${condition.label}-${condition.value}`}>
            <div className="flex items-center justify-between gap-3 text-sm"><DataChip label={condition.label} value={condition.value} /><span className="font-semibold tabular-nums">{condition.count}</span></div>
            <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(condition.count / max) * 100}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RuleGrid({ rules, category }: { rules: Rule[]; category: RuleCategory }) {
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => setShowAll(false), [rules]);
  const visible = showAll ? rules : rules.slice(0, 6);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((rule, index) => <RuleCard key={rule.ruleId} rule={rule} rank={index + 1} showSupport={category === "retention" || rule.category === "retention"} />)}
      </div>
      {rules.length > 12 ? (
        <Button type="button" variant="outline" className="w-full" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Show first 6" : `Show all ${rules.length}`}
        </Button>
      ) : null}
    </div>
  );
}

function RuleCard({ rule, rank, showSupport }: { rule: Rule; rank: number; showSupport: boolean }) {
  const description = describeRule(rule);
  return (
    <article className="break-inside-avoid rounded-lg border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge variant="secondary">#{rank}</Badge><Badge variant={rule.category === "churn" ? "destructive" : "default"}>{rule.category}</Badge></div><p className="mt-2 font-semibold leading-5">{description.headline}</p></div>
        <div className="shrink-0 text-right"><p className="text-[11px] text-muted-foreground">{showSupport ? "Support" : "Lift"}</p><p className="text-3xl font-bold tabular-nums">{showSupport ? formatPct(rule.support, 2) : rule.lift.toFixed(2)}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{description.conditions.map((condition) => <DataChip key={condition.raw} label={condition.label} value={condition.value} title={condition.raw} />)}</div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        {!showSupport ? <span>Support <strong className="text-foreground">{formatPct(rule.support, 2)}</strong></span> : <span>Lift <strong className="text-foreground">{rule.lift.toFixed(2)}</strong></span>}
        <span>Confidence <strong className="text-foreground">{formatPct(rule.confidence)}</strong></span>
      </div>
    </article>
  );
}

function RuleTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: RankingRow }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div style={chartTooltipContentStyle({ maxWidth: 320 })}><p className="text-xs font-semibold">{row.conditions}</p><div style={CHART_TOOLTIP_ITEM_STYLE}>Support {row.support.toFixed(2)}% - Lift {row.lift.toFixed(2)}</div></div>;
}

function summarizeRules(rules: Rule[]) {
  const churn = rules.filter((rule) => rule.category === "churn").length;
  const avgConfidence = rules.length ? rules.reduce((sum, rule) => sum + rule.confidence, 0) / rules.length : 0;
  const maxLift = rules.length ? Math.max(...rules.map((rule) => rule.lift)) : 0;
  return { churn, avgConfidence, maxLift };
}

function getSliderMax(rules: Rule[]) {
  const loadedMax = rules.length ? Math.max(...rules.map((rule) => rule.lift)) : 1;
  return Math.max(1, Math.ceil(loadedMax * 10 - 1e-9) / 10);
}

function getCategoryCount(rules: Rule[], category: RuleCategory) {
  return category === "all" ? rules.length : rules.filter((rule) => rule.category === category).length;
}

function truncate(value: string) {
  return value.length > 26 ? `${value.slice(0, 23)}...` : value;
}

function conditionFrequency(rules: Rule[]) {
  const counts = new Map<string, { label: string; value: string; count: number }>();
  for (const rule of rules) {
    for (const condition of parseRuleSide(rule.lhs)) {
      const key = `${condition.label}:${condition.value}`;
      const current = counts.get(key);
      counts.set(key, { label: condition.label, value: condition.value, count: (current?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
