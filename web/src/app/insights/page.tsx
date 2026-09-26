"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { InsightVisualCard } from "@/components/insights/InsightVisualCard";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights, useInsightVisuals } from "@/hooks/useInsights";

export default function InsightsPage() {
  const { data: insights, isLoading, error } = useInsights();
  const { data: visuals, isLoading: visualsLoading } = useInsightVisuals();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const prioritySignals = (insights ?? [])
    .flatMap((insight) => {
      const visual = visuals?.find((item) => item.title === insight.title);
      return insight.priority === 1 && visual ? [{ insight, visual }] : [];
    })
    .slice(0, 3);
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
    <div className="insights-page flex min-w-0 flex-col">
      <Header title="Insights" />
      <main className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Churn signals</h1>
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

        {visualsLoading ? (
          <div className="grid gap-3 sm:grid-cols-3" aria-label="Loading priority signals">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : prioritySignals.length > 0 ? (
          <section
            aria-label="Priority signals"
            className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-3"
          >
            {prioritySignals.map(({ insight, visual }) => (
              <div
                key={insight.insightId}
                className="min-w-0 border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold tracking-tight tabular-nums">
                    {visual.headline.value}
                  </p>
                  {visual.lift ? <Badge>{visual.lift} base</Badge> : null}
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  {visual.headline.label}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[34rem]" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as { message?: string }).message ?? "Insights are unavailable."}
          </p>
        ) : insights?.length ? (
          <section
            aria-label="All insights"
            className="grid min-w-0 gap-4 lg:grid-cols-2 print:grid-cols-1"
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
  );
}
