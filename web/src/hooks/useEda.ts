"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useEdaDescribe() {
  return useQuery({
    queryKey: ["eda", "describe"],
    queryFn: api.edaDescribe,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEdaDistribution(col: string | null, bins = 20, split?: "Default", binning: "quantile" | "equal-width" = "equal-width") {
  return useQuery({
    queryKey: ["eda", "distribution", col, bins, split, binning],
    queryFn: () => api.edaDistribution(col!, bins, split, binning),
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

export function useEdaDefaultBy(dim: string | null) {
  return useQuery({
    queryKey: ["eda", "default-by", dim],
    queryFn: () => api.edaDefaultBy(dim!),
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

export function usePcaMeta() {
  return useQuery({
    queryKey: ["eda", "pca-2d", "meta"],
    queryFn: api.edaPcaMeta,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
