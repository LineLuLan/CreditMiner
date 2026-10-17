"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RuleGlossary,
  RuleFamilies,
  FamilyChart,
  FamilyLadders,
} from "@/components/rules/RuleEvidence";
import { useRuleFamilies } from "@/hooks/useRules";
import { useMiningReport } from "@/hooks/useMiningReport";
import { filterRuleFamilies, shortRuleName, strongestDefaultFamily } from "@/lib/rules-format";
import { formatDecimal, formatInt, formatMultiplier, formatPct1 } from "@/lib/format";

type RuleCategory = "default" | "nonDefault";

export default function RulesPage() {
  const [minLift, setMinLift] = React.useState(1);
  const [category, setCategory] = React.useState<RuleCategory>("default");
  const minLiftId = React.useId();
  const defaults = useRuleFamilies("default");
  const nonDefaults = useRuleFamilies("nonDefault");
  const { data: report } = useMiningReport();
  const query = category === "default" ? defaults : nonDefaults;
  const { data, isLoading, error } = query;
  const allFamilies = data?.families ?? [];
  const maxLift = Math.max(
    1,
    Math.ceil(Math.max(1, ...allFamilies.map((family) => family.baseRule?.lift ?? 1)) * 100) / 100,
  );
  const families = filterRuleFamilies(allFamilies, minLift);
  const confidences = families.flatMap((family) => [
    ...(family.baseRule ? [family.baseRule.confidence] : []),
    ...family.modifiers.map((modifier) => modifier.confidence),
  ]);
  const topFamily = strongestDefaultFamily(defaults.data?.families ?? []);
  const topDefault = topFamily?.baseRule;
  const topModifier = topFamily?.modifiers.slice().sort((a, b) => b.confidence - a.confidence)[0];

  return (
    <div className="flex min-w-0 flex-col">
      <Header title="Association Rules" />
      <main className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
        <Card>
          <CardContent className="space-y-3 p-5 sm:p-6">
            <p className="text-sm font-medium text-muted-foreground">Strongest well-supported family (base support &gt;= 2% of clients)</p>
            {defaults.isLoading ? (
              <Skeleton className="h-20" />
            ) : topDefault ? (
              <>
                <p className="max-w-5xl break-words text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                  {shortRuleName(topDefault)} {"-> "}
                  <span className="text-danger">{formatPct1(topDefault.confidence)}</span> default (
                  {formatMultiplier(topDefault.lift)})
                </p>
                <p className="text-sm text-muted-foreground">
                  n = {topDefault.lhsCount == null ? "-" : formatInt(topDefault.lhsCount)} clients, {topDefault.jointCount == null ? "-" : formatInt(topDefault.jointCount)} defaulted
                  {topModifier && (
                    <>
                      ; adding {topModifier.label} pushes it to {formatPct1(topModifier.confidence)}
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {defaults.error
                  ? "Rule evidence is unavailable."
                  : "No default base rules meet the 2% support threshold."}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Portfolio baseline: {formatPct1(defaults.data?.baseline.defaultRate)} default.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Tabs
                value={category}
                onValueChange={(next) => {
                  setCategory(next as RuleCategory);
                  setMinLift(1);
                }}
                className="min-w-0 flex-1"
              >
                <TabsList className="grid h-auto w-full grid-cols-2" aria-label="Rule category">
                  <TabsTrigger value="default">Default</TabsTrigger>
                  <TabsTrigger value="nonDefault">Non-default</TabsTrigger>
                </TabsList>
              </Tabs>
              <RuleGlossary />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Filter by base lift. Combined-only families have no base lift and appear only at the
                minimum setting.
              </p>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={minLiftId}>Minimum family lift</Label>
                <span className="text-sm tabular-nums">{formatDecimal(minLift)}</span>
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
                aria-valuetext={formatMultiplier(minLift)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-80" />
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-sm text-danger">
              {(error as { message?: string }).message ?? "Rules unavailable"}
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Rule metrics">
              <Metric label={category === "default" ? "Families (default rules)" : "Families (non-default class)"} value={formatInt(families.length)} />
              <Metric
                label={category === "default" ? "Rules (default class)" : "Rules (non-default class)"}
                value={formatInt(families.reduce((sum, family) => sum + family.memberCount, 0))}
              />
              <Metric
                label="Best confidence"
                value={formatPct1(confidences.length ? Math.max(...confidences) : null)}
              />
              <Metric
                label="Baseline default rate"
                value={formatPct1(data?.baseline.defaultRate)}
              />
            </section>
            {report?.summary?.ruleCount != null && report.summary.familyCount != null ? (
              <p className="text-xs text-muted-foreground">
                All outcomes: {formatInt(report.summary.ruleCount)} rules in {formatInt(report.summary.familyCount)} families
              </p>
            ) : null}
            {families.length && data ? (
              <>
                <FamilyChart
                  families={families}
                  baseline={data.baseline.defaultRate}
                  outcome={category}
                />
                <FamilyLadders families={families} groups={data.groups} outcome={category} />
                <RuleFamilies families={families} outcome={category} methodology={report?.methodology?.associationRules} />
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No matching rules</CardTitle>
                  <CardDescription>
                    Lower the minimum lift or choose another category.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}
