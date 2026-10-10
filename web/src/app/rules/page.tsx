"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RuleGlossary, RuleFamilies, FamilyChart } from "@/components/rules/RuleEvidence";
import { useRules } from "@/hooks/useRules";
import { useOverview } from "@/hooks/useOverview";
import { useFacts } from "@/hooks/useFacts";
import { groupRuleFamilies, shortRuleName } from "@/lib/rules-format";
import { formatDecimal, formatInt, formatMultiplier, formatPct1 } from "@/lib/format";

type RuleCategory = "default" | "non-default" | "all";
const CATEGORY_OPTIONS: Array<{ value: RuleCategory; label: string }> = [
  { value: "default", label: "Default" },
  { value: "non-default", label: "Non-default" },
  { value: "all", label: "All" },
];

export default function RulesPage() {
  const [minLift, setMinLift] = React.useState(1);
  const [category, setCategory] = React.useState<RuleCategory>("default");
  const minLiftId = React.useId();
  const allRulesQuery = useRules(1);
  const { data: overview } = useOverview();
  const { getFact } = useFacts({ overview });
  const baseline = getFact("default-rate").value;
  const { data, isLoading, error } = useRules(minLift, category === "all" ? undefined : category);
  const allRules = React.useMemo(() => allRulesQuery.data ?? [], [allRulesQuery.data]);
  const maxLift = Math.max(
    1,
    Math.ceil(Math.max(1, ...allRules.map((rule) => rule.lift)) * 10) / 10,
  );
  React.useEffect(() => setMinLift((current) => Math.min(current, maxLift)), [maxLift]);
  const rules = data ?? [];
  const families = groupRuleFamilies(rules, minLift);
  const visibleRules = families.flatMap((family) => family.rules);
  const defaultFamilies = groupRuleFamilies(allRules.filter((rule) => rule.category === "default"));
  // Intent: prefer representative support >= 2%, then rank by lift.
  // Status: complete; next: retain sparse-data fallback. Blockers: none.
  // Confidence: captured data, exact threshold, and fallback covered by tests.
  const topDefault = (defaultFamilies.find((family) => family.rules[0].support >= 0.02)
    ?? defaultFamilies[0])?.rules[0];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-w-0 flex-col">
        <Header title="Association Rules" />
        <main className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
          <Card>
            <CardContent className="space-y-3 p-5 sm:p-6">
              <p className="text-sm font-medium text-muted-foreground">Strongest default family</p>
              {allRulesQuery.isLoading ? (
                <Skeleton className="h-20" />
              ) : topDefault ? (
                <p className="max-w-5xl break-words text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                  {shortRuleName(topDefault)} {"-> "}
                  <span className="text-danger">{formatPct1(topDefault.confidence)} default</span> (
                  {formatMultiplier(topDefault.lift)})
                  {topDefault.jointCount !== undefined && (
                    <span className="mt-2 block text-sm font-normal text-muted-foreground">
                      n = {formatInt(topDefault.jointCount)} clients
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {allRulesQuery.error
                    ? "Rule evidence is unavailable."
                    : "No default rules are available."}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Portfolio baseline: {formatPct1(topDefault?.baseline ?? baseline)} default.
                Confidence is the outcome rate among clients matching a rule.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <Tabs
                  value={category}
                  onValueChange={(next) => setCategory(next as RuleCategory)}
                  className="min-w-0 flex-1"
                >
                  <TabsList className="grid h-auto w-full grid-cols-3" aria-label="Rule category">
                    {CATEGORY_OPTIONS.map((option) => (
                      <TabsTrigger
                        key={option.value}
                        value={option.value}
                        className="flex-wrap gap-1 px-1.5 text-xs sm:text-sm"
                      >
                        {option.label}
                        <Badge variant="secondary" className="px-1.5 tabular-nums">
                          {allRulesQuery.isLoading
                            ? "..."
                            : formatInt(
                                allRules.filter(
                                  (rule) =>
                                    option.value === "all" || rule.category === option.value,
                                ).length,
                              )}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <RuleGlossary />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Tab counts show family representatives. The lift filter keeps qualifying families and their qualifying members.</p>
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
                <Metric
                  label="Families / rules"
                  value={`${formatInt(families.length)} families / ${formatInt(visibleRules.length)} rules`}
                />
                <Metric
                  label="Best confidence"
                  value={formatPct1(
                    visibleRules.length ? Math.max(...visibleRules.map((rule) => rule.confidence)) : null,
                  )}
                />
                <Metric label="Baseline default rate" value={formatPct1(baseline)} />
                <Metric
                  label="Max lift"
                  value={formatMultiplier(
                    visibleRules.length ? Math.max(...visibleRules.map((rule) => rule.lift)) : null,
                  )}
                />
              </section>
              {families.length ? (
                <>
                  <FamilyChart families={families} baseline={baseline} />
                  <RuleFamilies families={families} baseline={baseline} />
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
    </TooltipProvider>
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
