"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CLUSTER_COLORS } from "@/lib/constants";

export interface ScatterPoint {
  x: number;
  y: number;
  z?: number;
  cluster?: number;
  label?: string;
}

interface Props {
  data: ScatterPoint[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

/** 2D scatter plot (used by /clusters PCA visualization and /rules sup-conf chart). */
export function ScatterPlot({ data, xLabel, yLabel, height = 360 }: Props) {
  // Group by cluster for distinct colors
  const groups = new Map<number, ScatterPoint[]>();
  for (const p of data) {
    const k = p.cluster ?? 0;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 16, right: 16, bottom: 32, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" dataKey="x" name={xLabel} />
        <YAxis type="number" dataKey="y" name={yLabel} />
        <ZAxis type="number" dataKey="z" range={[40, 120]} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        {[...groups.entries()].map(([cluster, pts]) => (
          <Scatter
            key={cluster}
            name={`Cluster ${cluster}`}
            data={pts}
            fill={CLUSTER_COLORS[cluster % CLUSTER_COLORS.length]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
