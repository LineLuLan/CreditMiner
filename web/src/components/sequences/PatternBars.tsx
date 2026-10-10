import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CHART_SEMANTIC } from "@/lib/chart-theme";
import { formatCount, formatPct } from "@/lib/format";
import { humanisePattern } from "@/lib/sequence-format";
import type { SequencePattern } from "@/types/api.types";

export function PatternBars({ patterns }: { patterns: SequencePattern[] }) {
  const rows = patterns.slice(0, 5);
  return (
    <Card className="min-w-0">
      <CardHeader className="p-5">
        <h2 className="text-base font-semibold">Top {formatCount(rows.length)} default patterns</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Share of each group with the pattern. Every bar uses the same 0 to 100% scale.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5">
        {rows.length ? (
          rows.map((pattern, index) => (
            <div key={`${pattern.pattern}-${index}`} className="min-w-0 space-y-2">
              <p className="break-words text-sm font-medium leading-6">
                {humanisePattern(pattern).text}
              </p>
              <SupportBar
                label="Default"
                value={pattern.supportDefault}
                color={CHART_SEMANTIC.danger}
              />
              <SupportBar
                label="Non-default"
                value={pattern.supportNonDefault}
                color={CHART_SEMANTIC.neutral}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No patterns are available for comparison.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SupportBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-3 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
        <div
          className="h-full rounded-sm"
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-right tabular-nums">{formatPct(value)}</span>
    </div>
  );
}
