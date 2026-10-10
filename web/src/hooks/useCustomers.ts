"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CustomerQueryParams } from "@/lib/api";

export function useCustomers(params: CustomerQueryParams) {
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
