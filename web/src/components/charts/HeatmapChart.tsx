"use client";

interface Props {
  columns: string[];
  matrix: number[][];
}

/**
 * Custom Recharts-free heatmap for square correlation matrices.
 * Wide matrices scroll inside this component instead of stretching the page.
 */
export function HeatmapChart({ columns, matrix }: Props) {
  const cell = "h-8 w-8 rounded-sm";

  return (
    <div className="max-w-full overflow-auto rounded-md border bg-background/30">
      <table className="min-w-max border-separate border-spacing-1 p-3 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background" />
            {columns.map((column) => (
              <th key={column} className="pb-1 text-left font-normal text-muted-foreground">
                <span className="block max-w-20 truncate text-[11px]" title={column}>
                  {column}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={columns[i] ?? i}>
              <th
                className="sticky left-0 z-10 max-w-44 bg-background pr-2 text-right text-[11px] font-normal text-muted-foreground"
                title={columns[i]}
              >
                <span className="block truncate">{columns[i]}</span>
              </th>
              {row.map((value, j) => (
                <td key={`${columns[i]}-${columns[j]}`} className="p-0">
                  <div
                    className={cell}
                    style={{ backgroundColor: corrColor(value) }}
                    title={`${columns[i]} x ${columns[j]} = ${value.toFixed(2)}`}
                  >
                    <span className="block h-full w-full text-center text-[10px] leading-8 text-foreground/80">
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
  // Positive correlation → primary blue; negative → destructive red.
  // Alpha encodes magnitude; CSS vars keep it theme-aware in light/dark.
  if (clamped >= 0) {
    return `hsl(var(--chart-1) / ${clamped.toFixed(2)})`;
  }
  return `hsl(var(--destructive) / ${Math.abs(clamped).toFixed(2)})`;
}
