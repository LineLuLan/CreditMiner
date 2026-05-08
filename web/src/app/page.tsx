"use client";

import { Header } from "@/components/layout/Header";
import { KPICard } from "@/components/charts/KPICard";
import { DonutChart } from "@/components/charts/DonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/useOverview";
import { formatInt, formatPct } from "@/lib/utils";

/**
 * Overview Dashboard (/).
 *
 * <p>4 KPI cards + churn donut + tier breakdown.
 * Data via {@link useOverview}.</p>
 */
export default function OverviewPage() {
  const { data, isLoading, error } = useOverview();

  return (
    <div className="flex flex-col">
      <Header title="Overview" />
      <div className="flex-1 space-y-6 p-6">
        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : (
            <>
              <KPICard label="Total customers" value={formatInt(data.totalCustomers)} />
              <KPICard
                label="Attrited"
                value={formatInt(data.attritedCount)}
                hint={`${formatPct(data.churnRate)} churn rate`}
              />
              <KPICard label="Avg risk score" value={data.avgRiskScore.toFixed(2)} />
              <KPICard label="Avg utilization" value={formatPct(data.avgUtilization)} />
            </>
          )}
        </div>

        {/* Charts row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Churn split</CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <DonutChart
                  data={[
                    { name: "Existing", value: data.totalCustomers - data.attritedCount },
                    { name: "Attrited", value: data.attritedCount },
                  ]}
                />
              ) : (
                <Skeleton className="h-60" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tier breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <DonutChart
                  data={Object.entries(data.tierBreakdown).map(([name, value]) => ({
                    name,
                    value,
                  }))}
                />
              ) : (
                <Skeleton className="h-60" />
              )}
            </CardContent>
          </Card>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            {(error as { message?: string }).message ?? "Failed to load overview"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
