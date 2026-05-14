"use client";

import { Lightbulb, Search, FileText, Wrench } from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights } from "@/hooks/useInsights";

export default function InsightsPage() {
  const { data, isLoading } = useInsights();

  return (
    <div className="flex flex-col">
      <Header title="Business Insights" />
      <div className="flex-1 space-y-6 p-6">
        {isLoading || !data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {data.map((insight, idx) => (
                  <AccordionItem
                    key={insight.insightId}
                    value={`i-${insight.insightId}`}
                  >
                    <AccordionTrigger>
                      <div className="flex w-full items-center justify-between gap-3 pr-4">
                        <span className="flex items-center gap-3 text-left">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{insight.title}</span>
                        </span>
                        <Badge
                          variant={
                            insight.category?.toLowerCase().includes("churn")
                              ? "destructive"
                              : "secondary"
                          }
                          className="shrink-0"
                        >
                          {insight.category}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <Section icon={Search} label="Discovery" tone="info">
                          {insight.discovery}
                        </Section>
                        <Section icon={FileText} label="Evidence" tone="muted">
                          {insight.evidence}
                        </Section>
                        <Section icon={Wrench} label="Recommendation" tone="primary">
                          {insight.recommendation}
                        </Section>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {data.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Lightbulb className="h-6 w-6 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">No insights available yet.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: typeof Search;
  label: string;
  tone: "info" | "muted" | "primary";
  children: React.ReactNode;
}) {
  const accent =
    tone === "primary"
      ? "border-l-primary bg-primary/5"
      : tone === "info"
        ? "border-l-info bg-info/5"
        : "border-l-muted-foreground/30";
  return (
    <div className={`border-l-2 pl-3 ${accent}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
