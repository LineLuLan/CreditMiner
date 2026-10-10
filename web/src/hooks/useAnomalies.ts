"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Intent: show only ranked anomaly evidence, never broad preprocessing flags.
// Status: request the backend cap. Next: pagination if the ranked list exceeds it.
// Blocker: none for the captured list. Confidence: complete for returned clients only.
export const ANOMALY_LIST_LIMIT = 1000;

export function useAnomalies() {
  return useQuery({
    queryKey: ["anomalies", ANOMALY_LIST_LIMIT],
    queryFn: () => api.anomalies(ANOMALY_LIST_LIMIT),
  });
}
