"use client";

import { FactsProvider } from "@/components/charts/FactValue";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { InsightVisualCard } from "@/components/insights/InsightVisualCard";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights, useInsightVisuals } from "@/hooks/useInsights";

export default function InsightsPage() {
  const { data: insights, isLoading, error } = useInsights();
  const { data: visuals } = useInsightVisuals();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const allExpanded = Boolean(insights?.length) && expanded.size === insights?.length;

  const setAllDetails = () => {
    setExpanded(allExpanded ? new Set() : new Set(insights?.map((insight) => insight.insightId)));
  };

  const setDetails = (insightId: number, open: boolean) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (open) next.add(insightId);
      else next.delete(insightId);
      return next;
    });
  };

  return (
    <FactsProvider sources={{ insights, visuals }}>
    <div className="insights-page flex min-w-0 flex-col">
      <Header title="Insights" />
      <main className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-muted border-l-4 border-primary p-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Default signals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the number. Open details when you need evidence.
            </p>
          </div>
          {insights?.length ? (
            <Button type="button" variant="outline" onClick={setAllDetails} className="print:hidden">
              {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          ) : null}
        </section>

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[34rem]" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {(error as { message?: string }).message ?? "Insights are unavailable."}
          </p>
        ) : insights?.length ? (
          <section
            aria-label="All insights"
            className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2 print:grid-cols-1"
          >
            {insights.map((insight) => (
              <InsightVisualCard
                key={insight.insightId}
                insight={insight}
                visual={visuals?.find((visual) => visual.title === insight.title)}
                detailsOpen={expanded.has(insight.insightId)}
                onDetailsToggle={(open) => setDetails(insight.insightId, open)}
              />
            ))}
          </section>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
            <Lightbulb className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">No insights are available.</p>
          </div>
        )}
      </main>
    </div>
    </FactsProvider>
  );
}
