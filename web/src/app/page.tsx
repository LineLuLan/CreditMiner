"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Database, Gauge, ShieldAlert, Sparkles, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { KPICard } from "@/components/charts/KPICard";
import { DonutChart } from "@/components/charts/DonutChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/useOverview";
import { formatInt, formatPct } from "@/lib/utils";

export default function OverviewPage() {
  const { data, isLoading, error } = useOverview();

  const existingCount = data ? data.totalCustomers - data.attritedCount : 0;
  const topTier = data ? getTopTier(data.tierBreakdown) : null;
  const topTierShare = data && topTier ? topTier.value / data.totalCustomers : 0;
  const churnSeverity =
    data && data.churnRate >= 0.2 ? "High" : data && data.churnRate >= 0.14 ? "Moderate" : "Low";
  const riskStatus =
    data && data.avgRiskScore >= 0.55
      ? "Elevated"
      : data && data.avgRiskScore >= 0.35
        ? "Watch"
        : "Stable";

  return (
    <div className="flex flex-col">
      <Header title="Overview" />
      <div className="flex-1 space-y-6 p-6">
        {isLoading || !data ? (
          <OverviewSkeleton />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <Card className="overflow-hidden border-primary/30 bg-primary/5">
                <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Badge variant="secondary" className="w-fit">
                        Demo dataset
                      </Badge>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                          {formatInt(data.totalCustomers)} customer records mined
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          Historical churn, customer tiers, risk score, and utilization are loaded
                          from the local demo backend so the dashboard can explain the BankChurners
                          dataset without touching an external database.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <SignalStat
                        label="Historical churn"
                        value={formatPct(data.churnRate)}
                        note={`${formatInt(data.attritedCount)} attrited customers`}
                      />
                      <SignalStat
                        label="Retained base"
                        value={formatInt(existingCount)}
                        note={`${formatPct(existingCount / data.totalCustomers)} existing customers`}
                      />
                      <SignalStat
                        label="Largest tier"
                        value={topTier?.name ?? "n/a"}
                        note={topTier ? `${formatPct(topTierShare)} of dataset` : "No tier data"}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col">
                    <Button asChild>
                      <Link href="/mining-report">
                        <Brain className="mr-2 h-4 w-4" />
                        Mining report
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/predict">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Run prediction
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mining signals</CardTitle>
                  <CardDescription>Quick read for the report narrative.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SignalRow
                    icon={ShieldAlert}
                    label="Churn pressure"
                    value={churnSeverity}
                    detail={`${formatPct(data.churnRate)} historical attrition`}
                  />
                  <SignalRow
                    icon={Gauge}
                    label="Risk score"
                    value={riskStatus}
                    detail={`Average score ${data.avgRiskScore.toFixed(2)}`}
                  />
                  <SignalRow
                    icon={Users}
                    label="Tier balance"
                    value={topTier?.name ?? "n/a"}
                    detail={topTier ? `${formatInt(topTier.value)} customers` : "No tier records"}
                  />
                  <SignalRow
                    icon={Database}
                    label="Dataset coverage"
                    value="Ready"
                    detail={`${formatInt(data.totalCustomers)} rows available`}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KPICard
                label="Total customers"
                value={formatInt(data.totalCustomers)}
                hint="Full demo dataset"
              />
              <KPICard
                label="Attrited"
                value={formatInt(data.attritedCount)}
                hint={`${formatPct(data.churnRate)} churn rate`}
                className="border-destructive/30"
              />
              <KPICard
                label="Avg risk score"
                value={data.avgRiskScore.toFixed(2)}
                hint={`${riskStatus} portfolio signal`}
              />
              <KPICard
                label="Avg utilization"
                value={formatPct(data.avgUtilization)}
                hint="Credit usage ratio"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Churn split</CardTitle>
                  <CardDescription>
                    Class balance used by classification and report metrics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    height={300}
                    data={[
                      { name: "Existing", value: existingCount },
                      { name: "Attrited", value: data.attritedCount },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tier breakdown</CardTitle>
                  <CardDescription>
                    Customer-value tiers used for segmentation context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    height={300}
                    data={Object.entries(data.tierBreakdown).map(([name, value]) => ({
                      name,
                      value,
                    }))}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">CRISP-DM evidence path</CardTitle>
                <CardDescription>
                  How this dashboard turns the dataset into reportable mining evidence.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <PipelineStep
                  title="EDA"
                  body="Distribution, correlation, churn-by-dimension views."
                />
                <PipelineStep
                  title="Classification"
                  body="RandomForest-backed churn risk and feature signals."
                />
                <PipelineStep
                  title="Clustering"
                  body="k=3 personas with risk, churn, and centroid profiles."
                />
                <PipelineStep
                  title="Rules"
                  body="Apriori retention rules ranked by support, confidence, and lift."
                />
              </CardContent>
            </Card>
          </>
        )}

        {error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load overview"}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SignalStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border bg-card/60 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm font-semibold tabular-nums">{value}</p>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function PipelineStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[430px]" />
        <Skeleton className="h-[430px]" />
      </div>
    </div>
  );
}

function getTopTier(tierBreakdown: Record<string, number>) {
  return Object.entries(tierBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)[0];
}
