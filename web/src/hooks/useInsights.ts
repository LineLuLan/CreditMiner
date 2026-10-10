"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useInsights(category?: "driver" | "segment" | "context") {
  return useQuery({
    queryKey: ["insights", category],
    queryFn: () => api.insights(category),
  });
}

export function useInsightVisuals() {
  return useQuery({
    queryKey: ["insights", "visuals"],
    queryFn: api.insightVisuals,
    retry: false,
  });
}
