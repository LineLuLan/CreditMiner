"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHART_SEMANTIC } from "@/lib/chart-theme";
import { formatInt, formatMultiplier, formatPct1 } from "@/lib/format";
import {
  conditionText,
  RULE_ATTRIBUTE_LABELS,
  ruleConditions,
  shortRuleName,
  type RuleFamilyGroup,
} from "@/lib/rules-format";
import type { Rule } from "@/types/api.types";

export function RuleGlossary() {
  const id = React.useId();
  return (
    <>
      <button
        type="button"
        {...{ popovertarget: id }}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-4 w-4" aria-hidden /> Metrics
      </button>
      <div
        id={id}
        {...{ popover: "auto" as const }}
        aria-label="Rule metrics"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-5 text-card-foreground shadow-lg"
      >
        <h2 className="font-semibold">How to read the rules</h2>
        <dl className="mt-4 space-y-4 text-sm">
          {[
            ["Support", "Share of all clients matching both the conditions and outcome."],
            ["Confidence", "Outcome rate among clients matching the conditions."],
            ["Lift", "Confidence divided by the portfolio rate for that outcome."],
          ].map(([term, definition]) => (
            <div key={term}>
              <dt>
                <Badge variant="secondary">{term}</Badge>
              </dt>
              <dd className="mt-1 text-muted-foreground">{definition}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          {...{ popovertarget: id, popovertargetaction: "hide" }}
          className="mt-4 min-h-11 rounded-md border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Close
        </button>
      </div>
    </>
  );
}

function outcomeBaseline(rule: Rule, baseline: number | null): number | null {
  return (
    rule.baseline ??
    (baseline === null ? null : rule.category === "default" ? baseline : 1 - baseline)
  );
}

export function FamilyChart({
  families,
  baseline,
}: {
  families: RuleFamilyGroup[];
  baseline: number | null;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Top families by lift</CardTitle>
        <CardDescription>
          Shortest rule per family, ranked by lift. Bars show confidence; dashed lines show the
          portfolio rate for each outcome.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {families.slice(0, 8).map((family) => {
          const rule = family.rules[0];
          const rate = outcomeBaseline(rule, baseline);
          const color =
            rule.category === "default" ? CHART_SEMANTIC.danger : CHART_SEMANTIC.neutral;
          return (
            <div
              key={family.id}
              className="grid min-w-0 gap-2 border-b pb-4 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-5"
            >
              <div className="min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="block max-w-full truncate rounded-sm text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:whitespace-normal md:break-words"
                    >
                      {family.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="break-words">{family.label}</TooltipContent>
                </Tooltip>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rule.category === "default" ? "Default" : "Non-default"} {"\u00b7"}{" "}
                  {formatMultiplier(rule.lift)}
                </p>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap justify-between gap-x-3 text-xs tabular-nums">
                  <span>Confidence {formatPct1(rule.confidence)}</span>
                  <span className="text-muted-foreground">Base {formatPct1(rate)}</span>
                </div>
                <div
                  role="img"
                  aria-label={`${family.label}: ${formatPct1(rule.confidence)} confidence, ${formatPct1(rate)} baseline`}
                >
                  <ResponsiveContainer width="100%" height={32}>
                    <BarChart
                      data={[rule]}
                      layout="vertical"
                      margin={{ top: 4, right: 1, bottom: 4, left: 1 }}
                    >
                      <XAxis hide type="number" domain={[0, 1]} />
                      <YAxis hide type="category" dataKey="ruleId" />
                      <Bar
                        dataKey="confidence"
                        name="Confidence"
                        fill={color}
                        background={{ fill: "hsl(var(--muted))" }}
                        radius={[0, 3, 3, 0]}
                        isAnimationActive={false}
                      />
                      {rate !== null && (
                        <ReferenceLine
                          x={rate}
                          stroke={CHART_SEMANTIC.baseline}
                          strokeWidth={2}
                          strokeDasharray="4 3"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RuleFamilies({
  families,
  baseline,
}: {
  families: RuleFamilyGroup[];
  baseline: number | null;
}) {
  return (
    <section className="min-w-0 space-y-3" aria-label="Rule families">
      <h2 className="text-lg font-semibold">Rule families</h2>
      {families.map((family) => (
        <details
          key={family.id}
          open
          className="min-w-0 rounded-lg border bg-card text-card-foreground"
        >
          <summary className="cursor-pointer break-words rounded-lg p-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {family.label}{" "}
            <span className="font-normal text-muted-foreground">
              ({formatInt(family.rules.length)} rules)
            </span>
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <RuleCard rule={family.rules[0]} baseline={baseline} />
            {family.rules.length > 1 && (
              <details className="min-w-0">
                <summary className="w-fit cursor-pointer rounded-full border bg-secondary px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  +{formatInt(family.rules.length - 1)} similar
                </summary>
                <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
                  {family.rules.slice(1).map((rule) => (
                    <RuleCard key={rule.ruleId} rule={rule} baseline={baseline} />
                  ))}
                </div>
              </details>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}

function RuleCard({ rule, baseline }: { rule: Rule; baseline: number | null }) {
  const conditions = ruleConditions(rule);
  const exact = rule.conditions?.length
    ? conditions
        .map((condition) =>
          `${condition.label ?? RULE_ATTRIBUTE_LABELS[condition.attribute] ?? condition.attribute.replaceAll("_", " ")} ${condition.operator ?? "="} ${condition.value}`,
        )
        .join(", ")
    : conditions.map(conditionText).join("; ");
  return (
    <article className="min-w-0 rounded-md border p-4">
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="min-w-0 flex-1 break-words font-semibold leading-6">
          {shortRuleName(rule)}
        </h3>
        <Badge variant={rule.category === "default" ? "danger" : "secondary"}>
          {rule.category === "default" ? "Default" : "Non-default"}
        </Badge>
      </div>
      <p
        className="mt-2 break-words text-xs leading-5 text-muted-foreground"
        title={conditions.map(conditionText).join("; ")}
      >
        {exact}
      </p>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        {[
          ["Confidence", formatPct1(rule.confidence)],
          ["Portfolio rate", formatPct1(outcomeBaseline(rule, baseline))],
          ["Lift", formatMultiplier(rule.lift)],
          ["Support", formatPct1(rule.support)],
          ...(rule.jointCount === undefined
            ? []
            : [["Matching clients", formatInt(rule.jointCount)]]),
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
