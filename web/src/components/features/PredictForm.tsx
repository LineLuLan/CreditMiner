"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Sparkles, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PredictRequestSchema } from "@/lib/schemas";
import { usePredict } from "@/hooks/usePredict";
import type { PredictRequest, PredictResponse } from "@/types/api.types";
import { PredictFields, SAMPLE_PROFILE } from "./PredictFields";
import { PredictResult } from "./PredictResult";

export function PredictForm() {
  const form = useForm<PredictRequest>({
    resolver: zodResolver(PredictRequestSchema),
    defaultValues: SAMPLE_PROFILE,
  });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const predict = usePredict();
  const [result, setResult] = React.useState<PredictResponse | null>(null);
  const [previousDefaultProb, setPreviousDefaultProb] = React.useState<number | null>(null);
  const latestResultRef = React.useRef<PredictResponse | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const formId = "predict-customer-form";

  const onSubmit = handleSubmit((values) =>
    predict.mutate(values, {
      onSuccess: (nextResult) => {
        setPreviousDefaultProb(latestResultRef.current?.defaultProb ?? null);
        latestResultRef.current = nextResult;
        setResult(nextResult);
      },
    }),
  );
  const errorMessage =
    predict.error && typeof predict.error === "object" && "message" in predict.error
      ? (predict.error as { message?: string }).message
      : undefined;

  React.useEffect(() => {
    if (!result) return;

    const frame = requestAnimationFrame(() => {
      const resultElement = resultRef.current;
      if (!resultElement) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultElement.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      resultElement.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [result]);

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 sm:items-center">
              <UserCog className="mt-0.5 h-4 w-4 text-muted-foreground sm:mt-0" aria-hidden />
              <div>
                <p className="text-sm font-medium">Use the reference client profile</p>
                <p className="text-xs text-muted-foreground">
                  This profile matches the API contract example.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <Button type="button" variant="outline" size="sm" onClick={() => reset(SAMPLE_PROFILE)}>
                Load reference profile
              </Button>

            </div>
          </CardContent>
        </Card>

        <form id={formId} onSubmit={onSubmit} className="space-y-6">
          <PredictFields
            register={register}
            watch={watch}
            setValue={setValue}
            errors={formState.errors}
          />
              <Button
                type="submit"
                form={formId}
                disabled={predict.isPending}
                className="w-full gap-2 text-white"
              >
                {predict.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Predicting...</>
                ) : (
                  <><Sparkles className="h-4 w-4" aria-hidden />Predict</>
                )}
              </Button>
        </form>

        {errorMessage ? (
          <Card className="border-danger/50 bg-danger/5">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-4 w-4 text-danger" aria-hidden />
              <p className="text-sm text-danger">{errorMessage}</p>
            </CardContent>
          </Card>
        ) : null}

      </div>
      <aside className="min-w-0 lg:sticky lg:top-4" aria-label="Prediction result">
        {result ? (
          <PredictResult
            data={result}
            previousDefaultProb={previousDefaultProb}
            resultRef={resultRef}
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-10">
              <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden />
              <h2 className="font-semibold">Your prediction appears here</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Enter a client profile and select Predict to see the probability of default,
                risk tier, nearest segment, and model guidance.
              </p>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
