"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMiningReport() {
  return useQuery({
    queryKey: ["mining-report"],
    queryFn: api.miningReport,
  });
}
