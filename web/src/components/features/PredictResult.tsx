"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPct, severity } from "@/lib/utils";
import type { PredictResponse } from "@/types/api.types";

/**
 * Result panel for {@code POST /api/predict}.
 *
 * <p>Layout: probability gauge + label badge (left) | top-3 features bar +
 * cluster card + recommendation (right).</p>
 */
export function PredictResult({ data }: { data: PredictResponse }) {
  const sev = severity(data.churnProb);
  const labelColor =
    data.label === "Attrited" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Probability + label */}
      <Card>
        <CardHeader>
          <CardTitle>Churn probability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Gauge value={data.churnProb} severity={sev} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Predicted label:</span>
            <Badge className={cn("text-xs", labelColor)} variant="outline">
              {data.label}
            </Badge>
            <span className="ml-auto text-sm text-muted-foreground">
              risk score {data.riskScore.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cluster + recommendation */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.cluster >= 0 ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Cluster {data.cluster}</Badge>
              <span className="text-sm font-medium">{data.clusterName}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Cluster lookup unavailable.</p>
          )}
          <p className="text-sm leading-relaxed">{data.recommendation}</p>
          <p className="text-xs text-muted-foreground">Model: {data.modelUsed}</p>
        </CardContent>
      </Card>

      {/* Top features */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top contributing features (Random Forest importance)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topFeatures.map((f) => (
            <FeatureBar key={f.name} name={f.name} value={f.contribution} max={maxContribution(data.topFeatures)} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function maxContribution(features: PredictResponse["topFeatures"]): number {
  return features.reduce((m, f) => Math.max(m, f.contribution), 0) || 1;
}

function Gauge({ value, severity }: { value: number; severity: "low" | "medium" | "high" }) {
  const pct = Math.round(value * 100);
  const fill =
    severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-4xl font-semibold tabular-nums">{pct}%</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {severity} risk
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", fill)}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function FeatureBar({ name, value, max }: { name: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{name}</span>
        <span className="tabular-nums text-muted-foreground">{formatPct(value, 2)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
