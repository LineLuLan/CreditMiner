"use client";

import * as React from "react";
import { Sparkles, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPct, severity } from "@/lib/utils";
import type { PredictResponse } from "@/types/api.types";

export function PredictResult({ data }: { data: PredictResponse }) {
  const sev = severity(data.churnProb);

  return (
    <div className="space-y-4" data-testid="predict-result">
      <Card className="overflow-hidden border-primary/20 shadow-md">
        <CardHeader className="bg-muted/40">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            Churn probability
          </CardTitle>
        </CardHeader>
        <CardContent className="grid items-center gap-6 py-8 md:grid-cols-[auto_1fr]">
          <SemicircleGauge value={data.churnProb} severity={sev} />
          <div className="flex flex-col items-center gap-3 md:items-start">
            <LabelBadge label={data.label} />
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                Risk score{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {data.riskScore.toFixed(2)}
                </span>
              </span>
              <span>
                Model{" "}
                <span className="font-semibold text-foreground">{data.modelUsed}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Threshold 0.5 separates Existing (&lt; 0.5) from Attrited (≥ 0.5).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-primary/30 shadow-sm md:col-span-3">
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

        <Card className="md:col-span-2">
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
                  <span className="text-3xl font-bold tabular-nums">{data.cluster}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {data.clusterName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customers in this segment show similar transaction and risk behaviour.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cluster lookup unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top contributing features
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (Random Forest importance)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topFeatures.map((f, idx) => (
            <FeatureBar
              key={f.name}
              rank={idx + 1}
              name={f.name}
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
  return features.reduce((m, f) => Math.max(m, f.contribution), 0) || 1;
}

function LabelBadge({ label }: { label: string }) {
  const isAttrited = label === "Attrited";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        isAttrited
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-success/40 bg-success/10 text-success",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isAttrited ? "bg-destructive" : "bg-success",
        )}
      />
      Predicted label: <span className="font-bold">{label}</span>
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
  const pct = Math.round(value * 100);
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
      ? "hsl(var(--destructive))"
      : severity === "medium"
        ? "hsl(var(--warning))"
        : "hsl(var(--success))";
  const severityCopy =
    severity === "high" ? "High risk" : severity === "medium" ? "Medium risk" : "Low risk";

  return (
    <div
      className="mx-auto flex flex-col items-center"
      role="img"
      aria-label={`Churn probability ${pct}%`}
    >
      <svg viewBox="0 0 200 130" className="h-[150px] w-[220px]" aria-hidden>
        <defs>
          <linearGradient id="gauge-bg" x1="0" x2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--warning))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.25" />
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
          style={{ transition: "stroke-dasharray 700ms ease-out" }}
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
        <text
          x="20"
          y="120"
          textAnchor="start"
          className="fill-muted-foreground"
          fontSize="9"
        >
          0
        </text>
        <text
          x="180"
          y="120"
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize="9"
        >
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
          {pct}%
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
  const pct = Math.max(2, Math.round((value / max) * 100));
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-2 font-medium">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
            {rank}
          </span>
          {name}
        </span>
        <span className="tabular-nums text-muted-foreground">{formatPct(value, 2)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${width}%`, transition: "width 600ms ease-out" }}
        />
      </div>
    </div>
  );
}
