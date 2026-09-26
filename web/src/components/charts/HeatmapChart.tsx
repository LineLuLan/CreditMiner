"use client";

import { EDA_FIELD_LABELS, EDA_FIELD_SHORT_LABELS } from "@/lib/constants";

interface Props {
  columns: string[];
  matrix: number[][];
}

/**
 * Compact, theme-aware heatmap for square correlation matrices.
 */
export function HeatmapChart({ columns, matrix }: Props) {
  return (
    <div className="max-w-full overflow-x-auto rounded-md border bg-background/30 lg:overflow-x-hidden">
      <table className="w-full min-w-[700px] table-fixed border-separate border-spacing-1 p-2 text-xs">
        <colgroup>
          <col className="w-28" />
          {columns.map((column) => (
            <col key={column} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background" />
            {columns.map((column) => (
              <th
                key={column}
                className="h-28 overflow-visible align-bottom font-normal text-muted-foreground"
              >
                <span
                  className="block origin-bottom-left -rotate-45 whitespace-nowrap pb-1 text-left text-[10px]"
                  title={`${EDA_FIELD_LABELS[column] ?? column} (${column})`}
                >
                  {EDA_FIELD_SHORT_LABELS[column] ?? column}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={columns[i] ?? i}>
              <th
                className="sticky left-0 z-10 bg-background pr-2 text-right text-[10px] font-normal text-muted-foreground"
                title={`${EDA_FIELD_LABELS[columns[i] ?? ""] ?? columns[i]} (${columns[i]})`}
              >
                <span className="block truncate">
                  {EDA_FIELD_SHORT_LABELS[columns[i] ?? ""] ?? columns[i]}
                </span>
              </th>
              {row.map((value, j) => (
                <td key={`${columns[i]}-${columns[j]}`} className="p-0">
                  <div
                    className="h-7 w-full rounded-sm"
                    style={{ backgroundColor: corrColor(value) }}
                    title={`${columns[i]} x ${columns[j]}: r = ${value.toFixed(2)}`}
                    aria-label={`${columns[i]} x ${columns[j]}: r = ${value.toFixed(2)}`}
                  >
                    <span className="block h-full w-full text-center text-[9px] leading-7 text-foreground/80">
                      {value.toFixed(1)}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function corrColor(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value));
  // Alpha encodes magnitude while CSS variables preserve light and dark themes.
  if (clamped >= 0) {
    return `hsl(var(--chart-1) / ${clamped.toFixed(2)})`;
  }
  return `hsl(var(--destructive) / ${Math.abs(clamped).toFixed(2)})`;
}
