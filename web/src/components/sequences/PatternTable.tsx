import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPct } from "@/lib/format";
import { deduplicatePatterns, humanisePattern } from "@/lib/sequence-format";
import type { SequencePattern } from "@/types/api.types";

export function PatternTable({ patterns }: { patterns: SequencePattern[] }) {
  const rows = deduplicatePatterns(patterns, 3);
  return (
    <Card className="min-w-0">
      <CardHeader className="p-5">
        <h2 className="text-base font-semibold">More common in non-default</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Repeated months are shortened; matching patterns appear once.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((pattern) => (
              <li key={pattern.pattern} className="space-y-3 py-4 first:pt-0 last:pb-0">
                <p className="break-words text-sm font-medium leading-6">
                  {humanisePattern(pattern).text}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Non-default</dt>
                    <dd className="mt-1 text-base font-semibold tabular-nums">
                      {formatPct(pattern.supportNonDefault)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Default</dt>
                    <dd className="mt-1 text-base tabular-nums text-danger">
                      {formatPct(pattern.supportDefault)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No non-default patterns are available.</p>
        )}
      </CardContent>
    </Card>
  );
}
