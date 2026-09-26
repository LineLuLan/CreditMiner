"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useEdaDistribution(col: string | null, bins = 20, split?: string) {
  return useQuery({
    queryKey: ["eda", "distribution", col, bins, split],
    queryFn: () => api.edaDistribution(col!, bins, split),
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

export function useEdaPca2d() {
  return useQuery({
    queryKey: ["eda", "pca-2d"],
    queryFn: api.edaPca2d,
    staleTime: 5 * 60 * 1000,
  });
}
