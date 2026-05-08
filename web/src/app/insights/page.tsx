"use client";

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

/**
 * Business insights (/insights).
 *
 * <p>Accordion of Discovery / Evidence / Recommendation entries.</p>
 */
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
              <Accordion type="multiple" className="w-full">
                {data.map((insight) => (
                  <AccordionItem key={insight.insightId} value={`i-${insight.insightId}`}>
                    <AccordionTrigger>
                      <div className="flex w-full items-center justify-between pr-4">
                        <span>{insight.title}</span>
                        <Badge variant="secondary">{insight.category}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Section label="Discovery">{insight.discovery}</Section>
                      <Section label="Evidence">{insight.evidence}</Section>
                      <Section label="Recommendation">{insight.recommendation}</Section>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}
