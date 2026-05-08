"use client";

interface Props {
  columns: string[];
  matrix: number[][];
}

/**
 * Custom Recharts-free heatmap (cleaner for square correlation matrices).
 *
 * <p>Color scale: red (negative) → white (0) → blue (positive),
 * mapped over [-1, 1].</p>
 */
export function HeatmapChart({ columns, matrix }: Props) {
  const cell = "h-10 w-10 rounded-sm";
  return (
    <div className="overflow-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c} className="px-2 pb-2 text-left font-normal text-muted-foreground">
                <span className="block max-w-[80px] truncate">{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th className="pr-2 text-right font-normal text-muted-foreground">{columns[i]}</th>
              {row.map((value, j) => (
                <td key={j} className="p-0.5">
                  <div
                    className={cell}
                    style={{ backgroundColor: corrColor(value) }}
                    title={`${columns[i]} × ${columns[j]} = ${value.toFixed(2)}`}
                  >
                    <span className="block h-full w-full text-center leading-10 text-[10px] text-foreground/70">
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
  // value in [-1, 1] -> hsl
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    const a = clamped; // 0..1
    return `rgba(59, 130, 246, ${a.toFixed(2)})`;
  } else {
    const a = -clamped;
    return `rgba(239, 68, 68, ${a.toFixed(2)})`;
  }
}
