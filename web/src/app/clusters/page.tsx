"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useClusters } from "@/hooks/useClusters";
import { CLUSTER_COLORS } from "@/lib/constants";
import { formatInt, formatPct, formatUsd } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Cluster } from "@/types/api.types";

const CENTROID_HIGHLIGHTS: Array<{ key: string; label: string; format: (v: number) => string }> = [
  { key: "Credit_Limit", label: "Credit limit", format: (v) => formatUsd(v) },
  { key: "Avg_Utilization_Ratio", label: "Avg utilization", format: (v) => formatPct(v, 1) },
  { key: "Total_Trans_Amt", label: "Total trans amount", format: (v) => formatUsd(v) },
  { key: "Total_Trans_Ct", label: "Total trans count", format: (v) => v.toFixed(0) },
];

export default function ClustersPage() {
  const { data, isLoading, error } = useClusters();

  return (
    <div className="flex flex-col">
      <Header title="Customer Segments" />
      <div className="flex-1 space-y-6 p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                {(error as { message?: string }).message ?? "Failed to load clusters"}
              </p>
            </CardContent>
          </Card>
        ) : data && data.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {data.map((c) => (
                <PersonaCard key={c.clusterId} cluster={c} />
              ))}
            </div>
            <ClusterComparisonChart clusters={data} />
            <ClusterTable clusters={data} />
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">No cluster data yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PersonaCard({ cluster }: { cluster: Cluster }) {
  const color = CLUSTER_COLORS[cluster.clusterId % CLUSTER_COLORS.length];
  const churnSeverity =
    cluster.churnRate > 0.2 ? "text-red-600 dark:text-red-400" :
    cluster.churnRate > 0.1 ? "text-amber-600 dark:text-amber-400" :
    "text-emerald-600 dark:text-emerald-400";

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{cluster.personaName}</CardTitle>
          <Badge variant="secondary">C{cluster.clusterId}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{cluster.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Size" value={formatInt(cluster.size)} />
          <Stat
            label="Churn rate"
            value={formatPct(cluster.churnRate)}
            valueClass={churnSeverity}
          />
          <Stat label="Avg risk" value={cluster.avgRisk.toFixed(2)} />
        </div>
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Centroid
          </p>
          {CENTROID_HIGHLIGHTS.map((h) => {
            const v = cluster.centroid[h.key];
            if (v === undefined || v === null) return null;
            return (
              <div key={h.key} className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">{h.label}</span>
                <span className="font-medium tabular-nums">{h.format(v)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function ClusterComparisonChart({ clusters }: { clusters: Cluster[] }) {
  const chartData = clusters.map((c) => ({
    name: c.personaName,
    churnPct: Math.round(c.churnRate * 1000) / 10,
    sizeShare: Math.round((c.size / clusters.reduce((s, x) => s + x.size, 0)) * 1000) / 10,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison: churn rate vs size share (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="churnPct" name="Churn rate" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={`churn-${i}`} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
              ))}
            </Bar>
            <Bar dataKey="sizeShare" name="Size share" fillOpacity={0.5} radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={`size-${i}`} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ClusterTable({ clusters }: { clusters: Cluster[] }) {
  const allKeys = Array.from(
    new Set(clusters.flatMap((c) => Object.keys(c.centroid))),
  ).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Centroid breakdown (all numeric features)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Feature</th>
              {clusters.map((c) => (
                <th key={c.clusterId} className="py-2 pr-4 font-medium">
                  C{c.clusterId} {c.personaName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allKeys.map((k) => (
              <tr key={k} className="border-b last:border-b-0">
                <td className="py-1.5 pr-4 font-medium">{k}</td>
                {clusters.map((c) => {
                  const v = c.centroid[k];
                  return (
                    <td key={c.clusterId} className="py-1.5 pr-4 tabular-nums">
                      {v === undefined || v === null ? "—" : v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
