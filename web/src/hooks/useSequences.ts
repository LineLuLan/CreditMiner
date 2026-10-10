"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Returns the raw Phase 10 artifact. Its view is implemented in a later task. */
export function useSequences() {
  return useQuery({
    queryKey: ["sequences"],
    queryFn: api.sequences,
  });
}
