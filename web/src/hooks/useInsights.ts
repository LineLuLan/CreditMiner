"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useInsights(category?: string) {
  return useQuery({
    queryKey: ["insights", category],
    queryFn: () => api.insights(category),
  });
}
