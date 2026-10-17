import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDecimal, formatPct } from "@/lib/format";
import { humanisePattern } from "@/lib/sequence-format";
import type { SequencePattern } from "@/types/api.types";

export function SequenceHero({ pattern }: { pattern?: SequencePattern }) {
  if (!pattern)
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          No default-associated patterns are available.
        </CardContent>
      </Card>
    );
  return (
    <Card className="min-w-0 border-danger/30">
      <CardContent className="space-y-3 p-5 sm:p-6">
        <Badge variant="outline">Leading default pattern</Badge>
        <h2 className="max-w-4xl break-words text-xl font-semibold leading-snug sm:text-2xl">
          {pattern.familyStory || humanisePattern(pattern).text}:{" "}
          <span className="text-danger">{formatPct(pattern.supportDefault)} of defaulters</span> vs{" "}
          {formatPct(pattern.supportNonDefault)} of non-defaulters (
          {formatDecimal(pattern.groupPrevalenceRatio ?? pattern.ratio, 1)}x more common among defaulters)
        </h2>
        <p className="break-words text-sm leading-6 text-muted-foreground">
          Exact pattern: {humanisePattern(pattern).text}
        </p>
        {pattern.ci95 && (pattern.ci95.supportDefault || pattern.ci95.supportNonDefault) ? (
          <p className="break-words text-xs leading-5 text-muted-foreground">
            95% confidence intervals: {[
              pattern.ci95.supportDefault
                ? `default ${formatPct(pattern.ci95.supportDefault.low)} - ${formatPct(pattern.ci95.supportDefault.high)}`
                : null,
              pattern.ci95.supportNonDefault
                ? `non-default ${formatPct(pattern.ci95.supportNonDefault.low)} - ${formatPct(pattern.ci95.supportNonDefault.high)}`
                : null,
            ].filter(Boolean).join("; ")}.
          </p>
        ) : null}
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Pattern prevalence compares the two groups; it is not a prediction for an individual
          client.
        </p>
      </CardContent>
    </Card>
  );
}
