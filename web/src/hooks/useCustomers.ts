"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCustomers(params: {
  page?: number;
  size?: number;
  attritionFlag?: string;
  clusterId?: number;
  sort?: string;
}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => api.customers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: number | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customer(id!),
    enabled: id != null,
  });
}
