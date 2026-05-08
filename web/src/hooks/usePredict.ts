"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PredictRequest } from "@/types/api.types";

export function usePredict() {
  return useMutation({
    mutationKey: ["predict"],
    mutationFn: (body: PredictRequest) => api.predict(body),
  });
}
