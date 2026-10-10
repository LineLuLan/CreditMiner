"use client";

import { formatCount, formatPct1 } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ConfusionMatrixProps {
  labels?: string[];
  matrix?: number[][];
  compact?: boolean;
  title?: string;
}

export function ConfusionMatrix({ labels, matrix, compact = false, title }: ConfusionMatrixProps) {
  if (!matrix || matrix.length < 2 || matrix.some((row) => row.length < 2)) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Confusion matrix unavailable.
      </div>
    );
  }

  const names = labels?.length === 2 ? labels : ["No", "Yes"];
  const max = Math.max(...matrix.flat(), 1);

  return (
    <div className={cn("min-w-0", compact ? "space-y-2" : "space-y-3")}>
      {title ? (
        <p className={cn("font-semibold break-words", compact ? "text-xs" : "text-sm")}>
          {title}
        </p>
      ) : null}
      <div
        className="grid grid-cols-[auto_repeat(2,minmax(0,1fr))] gap-1"
        role="img"
        aria-label={`Confusion matrix${title ? ` for ${title}` : ""}`}
      >
        <div />
        {names.map((name) => (
          <div
            key={`predicted-${name}`}
            className={cn(
              "truncate text-center font-medium text-muted-foreground",
              compact ? "text-[9px]" : "text-xs",
            )}
            title={`Predicted ${name}`}
          >
            Pred. {name.replace(" Customer", "")}
          </div>
        ))}
        {matrix.map((row, rowIndex) => {
          const rowTotal = row.reduce((sum, value) => sum + value, 0);
          return [
            <div
              key={`actual-${rowIndex}`}
              className={cn(
                "flex items-center justify-end pr-1 font-medium text-muted-foreground",
                compact ? "text-[9px]" : "text-xs",
              )}
              title={`Actual ${names[rowIndex]}`}
            >
              Actual {names[rowIndex]?.replace(" Customer", "")}
            </div>,
            ...row.map((value, columnIndex) => {
              const ratio = rowTotal > 0 ? value / rowTotal : 0;
              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={cn(
                    "flex aspect-[1.35] min-w-0 flex-col items-center justify-center rounded border text-center tabular-nums",
                    compact ? "p-1" : "p-3",
                  )}
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${0.08 + (value / max) * 0.62})`,
                    borderColor: "hsl(var(--primary) / 0.25)",
                  }}
                >
                  <span className={cn("font-bold", compact ? "text-xs" : "text-lg")}>
                    {formatCount(value)}
                  </span>
                  <span className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-xs")}>
                    {formatPct1(ratio)}
                  </span>
                </div>
              );
            }),
          ];
        })}
      </div>
      {!compact ? (
        <p className="text-xs text-muted-foreground">Rows are actual classes; percentages are within each row.</p>
      ) : null}
    </div>
  );
}
