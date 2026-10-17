"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_SEMANTIC } from "@/lib/chart-theme";
import { formatInt, formatMultiplier, formatPct1 } from "@/lib/format";
import { ruleLadders, shortRuleName } from "@/lib/rules-format";
import type { RuleFamily, RuleFamiliesResponse } from "@/lib/schemas";
import type { MiningReport } from "@/types/api.types";

type Outcome = "default" | "nonDefault";
type RulesMethodology = NonNullable<MiningReport["methodology"]>["associationRules"];

/**
 * Intent: every ranked view follows base lift, independent of API support order.
 * Status: shared by charts, cards and report tables; synthetic families stay last.
 * Next: retain this order if the API changes. Blockers: none.
 * Confidence: rendering regressions cover both outcomes and cached-data immutability.
 */
export function rankRuleFamilies(families: RuleFamily[]): RuleFamily[] {
  return [...families].sort((a, b) => {
    if (!a.baseRule) return b.baseRule ? 1 : 0;
    if (!b.baseRule) return -1;
    return b.baseRule.lift - a.baseRule.lift;
  });
}

export function RuleGlossary() {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer rounded-md border px-3 py-2">Metrics</summary>
      <dl className="mt-2 space-y-2">
        <div>
          <dt className="font-medium">Support</dt>
          <dd>Share of all clients matching both the conditions and outcome.</dd>
        </div>
        <div>
          <dt className="font-medium">Confidence</dt>
          <dd>Outcome rate among clients matching the conditions.</dd>
        </div>
        <div>
          <dt className="font-medium">Counts</dt>
          <dd>Clients match the conditions; Defaults or Non-defaults also match the outcome. A dash means the client count is unavailable.</dd>
        </div>
        <div>
          <dt className="font-medium">Lift</dt>
          <dd>Confidence divided by the portfolio rate for that outcome.</dd>
        </div>
      </dl>
    </details>
  );
}

export function RuleFootnote({ methodology }: { methodology?: RulesMethodology }) {
  const defaultSupport = methodology?.defaultPass?.finalSupport;
  const nonDefaultSupport = methodology?.nonDefaultPass?.finalSupport;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>Confidence is the outcome rate among clients matching the condition.</p>
      <p>Lift compares it with the portfolio rate.</p>
      <p>
        Modifiers are mined together with the base condition (Apriori{defaultSupport != null && nonDefaultSupport != null
          ? `, minimum support ${formatPct1(defaultSupport)} default / ${formatPct1(nonDefaultSupport)} non-default`
          : ""}).
      </p>
    </div>
  );
}

export function upliftText(value: number | null): string {
  return value === null ? "n/a" : `${value >= 0 ? "+" : ""}${value.toFixed(1)} pp`;
}

function ladderLevel(family: RuleFamily): string {
  const name = shortRuleName(family.baseRule!);
  const level = name.includes(": ") ? name.slice(name.indexOf(": ") + 2) : name;
  const lateMonths = level.match(/^Late in (\d+\+?) of 6 months$/);
  if (lateMonths) return `${lateMonths[1]} ${lateMonths[1] === "1" ? "month" : "months"} late`;
  return /^\d+\+? months?$/.test(level) ? `${level} late` : level;
}

export function FamilyChart({
  families,
  baseline,
  outcome,
}: {
  families: RuleFamily[];
  baseline: number;
  outcome: Outcome;
}) {
  const bases = rankRuleFamilies(families).filter((family) => family.baseRule);
  const rate = outcome === "default" ? baseline : 1 - baseline;
  const color = outcome === "default" ? CHART_SEMANTIC.danger : CHART_SEMANTIC.neutral;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Base conditions ranked</CardTitle>
        <CardDescription>
          Ranked by lift over the portfolio rate. Bars show confidence; the dashed line shows the portfolio outcome rate (
          {formatPct1(rate)}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bases.length ? (
          <div className="min-w-0">
            <div className="space-y-4 sm:space-y-1">
              {bases.map((family) => {
                const rule = family.baseRule!;
                return (
                  <div
                    key={family.familyId}
                    className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-2 sm:min-h-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem]"
                  >
                    <span className="col-span-2 break-words text-xs sm:col-span-1" title={shortRuleName(rule)}>
                      {shortRuleName(rule)}
                    </span>
                    <div
                      role="img"
                      aria-label={`${shortRuleName(rule)}: ${formatPct1(rule.confidence)} confidence, ${formatPct1(rate)} baseline`}
                      className="relative h-4 bg-muted"
                    >
                      <div
                        className="h-full rounded-r-sm"
                        style={{ width: `${rule.confidence * 100}%`, backgroundColor: color }}
                      />
                      <span
                        className="absolute -top-1 h-6 border-l-2 border-dashed"
                        style={{ left: `${rate * 100}%`, borderColor: CHART_SEMANTIC.baseline }}
                      />
                    </div>
                    <span className="text-right text-xs tabular-nums">
                      {formatPct1(rule.confidence)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No standalone base conditions meet this filter.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function FamilyLadders({
  families,
  groups,
  outcome,
}: {
  families: RuleFamily[];
  groups: RuleFamiliesResponse["groups"];
  outcome: Outcome;
}) {
  const ladders = ruleLadders(families, groups);
  if (!ladders.length) return null;
  return (
    <section aria-label="Condition ladders" className="grid gap-4 xl:grid-cols-3">
      {ladders.map((group) => (
        <Card key={group.attribute}>
          <CardHeader>
            <CardTitle>{group.attributeLabel}</CardTitle>
            <CardDescription>Condition levels in ascending order</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3" style={{ gridTemplateColumns: `repeat(${group.families.length}, minmax(0, 1fr))` }}>
              {group.families.map((family) => {
                const rule = family.baseRule!;
                return (
                  <li
                    key={family.familyId}
                    className="min-w-0 space-y-2 border-l-2 pl-3"
                  >
                    <span className="block break-words text-xs">{ladderLevel(family)}</span>
                    <span className="block text-sm tabular-nums">
                      <span
                        className="text-xl font-semibold"
                        style={{
                          color:
                            outcome === "default" ? CHART_SEMANTIC.danger : CHART_SEMANTIC.neutral,
                        }}
                      >
                        {formatPct1(rule.confidence)}
                      </span>{" "}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        n = {rule.lhsCount == null ? "-" : formatInt(rule.lhsCount)} clients
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {outcome === "default" ? "Defaults" : "Non-defaults"}: {rule.jointCount == null ? "-" : formatInt(rule.jointCount)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function RuleFamilies({ families, outcome, methodology }: { families: RuleFamily[]; outcome: Outcome; methodology?: RulesMethodology }) {
  const ranked = rankRuleFamilies(families);
  const singleConditions = ranked.filter((family) => family.baseRule && !family.modifiers.length);
  const combined = ranked.filter((family) => family.baseRule && family.modifiers.length);
  const synthetic = ranked.filter((family) => !family.baseRule);
  return (
    <section aria-label="Rule families" className="space-y-3">
      <h2 className="text-lg font-semibold">Rule families</h2>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {combined.map((family) => (
          <FamilyCard key={family.familyId} family={family} outcome={outcome} />
        ))}
      </div>
      {singleConditions.length ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Single-condition families</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {singleConditions.map((family) => {
                const base = family.baseRule!;
                return (
                  <li key={family.familyId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium">{shortRuleName(base)}</span>
                    <span className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
                      <span className={outcome === "default" ? "text-danger" : "text-foreground"}>{formatPct1(base.confidence)} {outcome === "default" ? "default" : "non-default"}</span>
                      <Badge variant="secondary">{formatMultiplier(base.lift)} lift</Badge>
                      <span className="text-muted-foreground">n = {base.lhsCount == null ? "-" : formatInt(base.lhsCount)} clients</span>
                      <span className="text-muted-foreground">{outcome === "default" ? "Defaults" : "Non-defaults"}: {base.jointCount == null ? "-" : formatInt(base.jointCount)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {synthetic.length ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {synthetic.map((family) => <FamilyCard key={family.familyId} family={family} outcome={outcome} />)}
        </div>
      ) : null}
      <RuleFootnote methodology={methodology} />
    </section>
  );
}

function FamilyCard({ family, outcome }: { family: RuleFamily; outcome: Outcome }) {
  const [expanded, setExpanded] = React.useState(false);
  const base = family.baseRule;
  const modifiers = expanded ? family.modifiers : family.modifiers.slice(0, 3);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="break-words text-base">
          {base ? shortRuleName(base) : family.label}
        </CardTitle>
        {base ? (
          <div className="flex flex-wrap items-center gap-3 tabular-nums">
            <span className={`text-3xl font-semibold ${outcome === "default" ? "text-danger" : "text-foreground"}`}>
              {formatPct1(base.confidence)}
            </span>
            <Badge variant="secondary">{formatMultiplier(base.lift)} lift</Badge>
            <span className="text-sm text-muted-foreground">n = {base.lhsCount == null ? "-" : formatInt(base.lhsCount)} clients</span>
            <span className="text-sm text-muted-foreground">{outcome === "default" ? "Defaults" : "Non-defaults"}: {base.jointCount == null ? "-" : formatInt(base.jointCount)}</span>
          </div>
        ) : (
          <CardDescription>Combined rules only; no standalone base rate was mined.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {modifiers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Modifier</th>
                  <th className="p-2 text-right">
                    {outcome === "default" ? "Default rate" : "Non-default rate"}
                  </th>
                  <th className="p-2 text-right">vs family</th>
                  <th className="p-2 text-right">Clients</th>
                  <th className="py-2 text-right">{outcome === "default" ? "Defaults" : "Non-defaults"}</th>
                </tr>
              </thead>
              <tbody>
                {modifiers.map((modifier) => (
                  <tr key={modifier.ruleId} className="border-b last:border-0">
                    <td className="py-2 pr-2" title={modifier.conditionText}>
                      {modifier.label}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {formatPct1(modifier.confidence)}
                    </td>
                    <td
                      className="whitespace-nowrap p-2 text-right tabular-nums"
                      style={{
                        color:
                          outcome === "default" && base && (modifier.upliftPp ?? 0) > 0
                            ? CHART_SEMANTIC.danger
                            : CHART_SEMANTIC.neutral,
                      }}
                    >
                      {upliftText(base ? modifier.upliftPp : null)}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {modifier.lhsCount == null ? "-" : formatInt(modifier.lhsCount)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatInt(modifier.jointCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No modifier changes this rate at the mining thresholds.
          </p>
        )}
        {family.modifiers.length > 3 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="min-h-11 rounded-md border px-3 text-xs font-medium"
          >
            {expanded ? "Show top 3" : `Show all ${family.modifiers.length}`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
