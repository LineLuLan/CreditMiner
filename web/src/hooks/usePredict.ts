"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PredictRequest } from "@/types/api.types";

export function usePredict() {
  return useMutation({
    mutationKey: ["predict"],
    mutationFn: (body: PredictRequest) => api.predict(body),
    onSuccess: (data) => {
      toast.success(
        `Predicted ${data.label} (${Math.round(data.churnProb * 100)}% churn) — ${data.clusterName}`,
      );
    },
    onError: (err) => {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message ?? "Prediction failed"
          : "Prediction failed";
      toast.error(msg);
    },
  });
}
