"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CLUSTER_COLORS } from "@/lib/constants";

interface Props {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export function DonutChart({ data, height = 240 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
