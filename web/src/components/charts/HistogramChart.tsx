"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  binEdges: number[];
  counts: number[];
  height?: number;
}

/** Display histogram counts as a bar chart. */
export function HistogramChart({ binEdges, counts, height = 320 }: Props) {
  const data = counts.map((count, i) => ({
    range: `${formatEdge(binEdges[i])}–${formatEdge(binEdges[i + 1])}`,
    count,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="range" angle={-30} textAnchor="end" height={60} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function formatEdge(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}
