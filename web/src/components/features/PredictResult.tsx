"use client";

import * as React from "react";
import { Sparkles, Target, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPct1 } from "@/lib/format";
import { EDA_FIELD_LABELS } from "@/lib/constants";
import type { PredictResponse } from "@/types/api.types";

export function PredictResult({
  data,
  previousDefaultProb,
  resultRef,
}: {
  data: PredictResponse;
  previousDefaultProb: number | null;
  resultRef: React.Ref<HTMLDivElement>;
}) {
  const sev = data.riskTier === "High" ? "high" : data.riskTier === "Medium" ? "medium" : "low";

  return (
    <div
      ref={resultRef}
      className="min-w-0 scroll-mt-4 space-y-4 break-words outline-none"
      data-testid="predict-result"
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="true"
    >
      <Card className="overflow-hidden border-primary/20 shadow-md">
        <CardHeader className="bg-muted/40">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            Default probability
          </CardTitle>
        </CardHeader>
        <CardContent className="grid min-w-0 items-center gap-3 py-5">
          <SemicircleGauge value={data.defaultProb} severity={sev} />
          <div className="flex min-w-0 flex-col items-center gap-3">
            <LabelBadge label={data.label} />
            {previousDefaultProb !== null ? (
              <p className="text-sm font-medium tabular-nums text-foreground">
                was {formatPct1(previousDefaultProb)} -&gt; now{" "}
                {formatPct1(data.defaultProb)}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                Risk tier <span className="font-semibold text-foreground">{data.riskTier}</span>
              </span>
              <span>
                Model <span className="font-semibold text-foreground">{data.modelUsed}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Scores below 0.5 predict No. Scores at or above 0.5 predict Yes.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4">
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{data.recommendation}</p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
              Nearest cluster
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cluster >= 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {data.clusterName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clients in this segment show similar payment and risk behaviour.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Cluster lookup unavailable.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top model drivers</CardTitle>
          <CardDescription>
            {data.importanceMethod ?? "Model-level feature importance (method unavailable)"}
            <span className="mt-1 block">Drivers are model-level importances, not per-client explanations.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topFeatures.map((f, idx) => (
            <FeatureBar
              key={f.name}
              rank={idx + 1}
              name={EDA_FIELD_LABELS[f.name] ?? f.name.replaceAll("_", " ")}
              value={f.contribution}
              max={maxContribution(data.topFeatures)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function maxContribution(features: PredictResponse["topFeatures"]): number {
  return features.reduce((m, f) => Math.max(m, Math.abs(f.contribution)), 0) || 1;
}

function LabelBadge({ label }: { label: string }) {
  const predictsDefault = label === "Yes";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        predictsDefault
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-success/40 bg-success/10 text-success",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", predictsDefault ? "bg-danger" : "bg-success")} />
      Default next month: <span className="font-bold">{label}</span>
    </div>
  );
}

function SemicircleGauge({
  value,
  severity,
}: {
  value: number;
  severity: "low" | "medium" | "high";
}) {
  const pct = value * 100;
  const [animatedPct, setAnimatedPct] = React.useState(0);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const radius = 80;
  const circumference = Math.PI * radius;
  const dash = (animatedPct / 100) * circumference;
  const strokeColor =
    severity === "high"
      ? "hsl(var(--danger))"
      : severity === "medium"
        ? "hsl(var(--warning))"
        : "hsl(var(--success))";
  const severityCopy =
    severity === "high" ? "High risk" : severity === "medium" ? "Medium risk" : "Low risk";

  return (
    <div
      className="mx-auto flex flex-col items-center"
      role="img"
      aria-label={`Default probability ${formatPct1(value)}`}
    >
      <svg viewBox="0 0 200 130" className="h-[150px] w-[220px] max-w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge-bg" x1="0" x2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--warning))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          stroke="url(#gauge-bg)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          stroke={strokeColor}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
        />
        <line
          x1="100"
          y1="14"
          x2="100"
          y2="28"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
        <text
          x="100"
          y="9"
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="9"
          fontWeight="700"
        >
          50%
        </text>
        <text x="20" y="120" textAnchor="start" className="fill-muted-foreground" fontSize="9">
          0
        </text>
        <text x="180" y="120" textAnchor="end" className="fill-muted-foreground" fontSize="9">
          100
        </text>
        <text
          x="100"
          y="92"
          textAnchor="middle"
          className="fill-foreground"
          fontSize="34"
          fontWeight="700"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPct1(value)}
        </text>
      </svg>
      <span className="eyebrow -mt-2">{severityCopy}</span>
    </div>
  );
}

function FeatureBar({
  rank,
  name,
  value,
  max,
}: {
  rank: number;
  name: string;
  value: number;
  max: number;
}) {
  const pct = Math.max(2, Math.round((Math.abs(value) / max) * 100));
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return (
    <div className="space-y-1">
      <div className="flex min-w-0 items-baseline justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
            {rank}
          </span>
          {name}
        </span>
        <span className="tabular-nums text-muted-foreground">{formatPct1(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-chart-neutral motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
