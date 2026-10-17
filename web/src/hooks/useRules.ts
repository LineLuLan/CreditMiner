"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRules(minLift = 1.0, category?: "default" | "non-default") {
  return useQuery({
    queryKey: ["rules", minLift, category],
    queryFn: () => api.rules(minLift, category),
  });
}

export function useRuleFamilies(category: "default" | "nonDefault") {
  return useQuery({
    queryKey: ["rule-families", category],
    queryFn: () => api.ruleFamilies(category),
  });
}
