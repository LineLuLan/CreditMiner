"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createFacts, type FactSources } from "@/lib/facts";

export function useFacts(sources: FactSources = {}) {
  const query = useQuery({
    queryKey: ["facts"],
    queryFn: api.facts,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { ...query, ...createFacts({ ...sources, catalogue: query.data ?? sources.catalogue }) };
}
