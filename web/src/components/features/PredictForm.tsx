"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Sparkles, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PredictRequestSchema } from "@/lib/schemas";
import { usePredict } from "@/hooks/usePredict";
import type { PredictRequest, PredictResponse } from "@/types/api.types";
import { PredictFields, PREDICT_SAMPLES, SAMPLE_LOW_RISK } from "./PredictFields";
import { PredictResult } from "./PredictResult";

export function PredictForm() {
  const form = useForm<PredictRequest>({
    resolver: zodResolver(PredictRequestSchema),
    defaultValues: SAMPLE_LOW_RISK,
  });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const predict = usePredict();
  const [result, setResult] = React.useState<PredictResponse | null>(null);
  const [previousChurnProb, setPreviousChurnProb] = React.useState<number | null>(null);
  const latestResultRef = React.useRef<PredictResponse | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const formId = "predict-customer-form";

  const onSubmit = handleSubmit((values) =>
    predict.mutate(values, {
      onSuccess: (nextResult) => {
        setPreviousChurnProb(latestResultRef.current?.churnProb ?? null);
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
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 sm:items-center">
              <UserCog className="mt-0.5 h-4 w-4 text-muted-foreground sm:mt-0" aria-hidden />
              <div>
                <p className="text-sm font-medium">Try a sample customer profile</p>
                <p className="text-xs text-muted-foreground">
                  Pre-fills the form with one of three reference profiles.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <div className="flex flex-wrap gap-2">
                {PREDICT_SAMPLES.map((sample) => (
                  <Tooltip key={sample.label}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reset(sample.value)}
                        className={
                          sample.tone === "destructive"
                            ? "border-destructive/40 hover:bg-destructive/10"
                            : sample.tone === "warning"
                              ? "border-warning/50 hover:bg-warning/10"
                              : "border-success/50 hover:bg-success/10"
                        }
                      >
                        <span
                          className={
                            sample.tone === "destructive"
                              ? "mr-2 h-2 w-2 rounded-full bg-destructive"
                              : sample.tone === "warning"
                                ? "mr-2 h-2 w-2 rounded-full bg-warning"
                                : "mr-2 h-2 w-2 rounded-full bg-success"
                          }
                          aria-hidden
                        />
                        {sample.buttonText}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{sample.tooltip}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <Button
                type="submit"
                form={formId}
                disabled={predict.isPending}
                className="w-full gap-2 sm:w-auto"
              >
                {predict.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Predicting...</>
                ) : (
                  <><Sparkles className="h-4 w-4" aria-hidden />Predict</>
                )}
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
        </form>

        {errorMessage ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </CardContent>
          </Card>
        ) : null}

        {result ? (
          <PredictResult
            data={result}
            previousChurnProb={previousChurnProb}
            resultRef={resultRef}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
