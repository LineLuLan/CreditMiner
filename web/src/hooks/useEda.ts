"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useEdaDistribution(col: string | null, bins = 20) {
  return useQuery({
    queryKey: ["eda", "distribution", col, bins],
    queryFn: () => api.edaDistribution(col!, bins),
    enabled: !!col,
  });
}

export function useEdaCorrelation() {
  return useQuery({
    queryKey: ["eda", "correlation"],
    queryFn: api.edaCorrelation,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEdaChurnBy(dim: string | null) {
  return useQuery({
    queryKey: ["eda", "churn-by", dim],
    queryFn: () => api.edaChurnBy(dim!),
    enabled: !!dim,
  });
}
