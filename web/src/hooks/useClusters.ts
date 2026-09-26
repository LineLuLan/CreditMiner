"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClusters() {
  return useQuery({ queryKey: ["clusters"], queryFn: api.clusters });
}

export function useClusterCustomers(id: number, page = 1, size = 20) {
  return useQuery({
    queryKey: ["clusters", id, "customers", page, size],
    queryFn: () => api.clusterCustomers(id, page, size),
    // Cluster ids start at 0, so a truthiness check would never load cluster 0;
    // the dialog passes -1 while closed, which must not fetch.
    enabled: id >= 0,
  });
}
