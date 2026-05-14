"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Sparkles, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PredictRequestSchema } from "@/lib/schemas";
import type { PredictRequest } from "@/types/api.types";
import { usePredict } from "@/hooks/usePredict";
import { PredictResult } from "@/components/features/PredictResult";

const SAMPLE_LOW_RISK: PredictRequest = {
  customerAge: 45,
  gender: "M",
  dependentCount: 3,
  educationLevel: "Graduate",
  maritalStatus: "Married",
  incomeCategory: "$60K - $80K",
  cardCategory: "Blue",
  monthsOnBook: 36,
  totalRelationshipCount: 5,
  monthsInactive12Mon: 2,
  contactsCount12Mon: 3,
  creditLimit: 12500,
  totalRevolvingBal: 800,
  totalTransAmt: 4500,
  totalTransCt: 45,
  avgUtilizationRatio: 0.064,
  totalAmtChngQ4Q1: 1.0,
  totalCtChngQ4Q1: 1.0,
};

const SAMPLE_MID_RISK: PredictRequest = {
  customerAge: 49,
  gender: "F",
  dependentCount: 2,
  educationLevel: "College",
  maritalStatus: "Married",
  incomeCategory: "$40K - $60K",
  cardCategory: "Blue",
  monthsOnBook: 30,
  totalRelationshipCount: 3,
  monthsInactive12Mon: 3,
  contactsCount12Mon: 3,
  creditLimit: 6500,
  totalRevolvingBal: 1500,
  totalTransAmt: 2400,
  totalTransCt: 30,
  avgUtilizationRatio: 0.42,
  totalAmtChngQ4Q1: 0.75,
  totalCtChngQ4Q1: 0.7,
};

const SAMPLE_HIGH_RISK: PredictRequest = {
  customerAge: 55,
  gender: "M",
  dependentCount: 4,
  educationLevel: "High School",
  maritalStatus: "Divorced",
  incomeCategory: "Less than $40K",
  cardCategory: "Blue",
  monthsOnBook: 24,
  totalRelationshipCount: 2,
  monthsInactive12Mon: 5,
  contactsCount12Mon: 4,
  creditLimit: 2500,
  totalRevolvingBal: 2000,
  totalTransAmt: 1200,
  totalTransCt: 15,
  avgUtilizationRatio: 0.8,
  totalAmtChngQ4Q1: 0.4,
  totalCtChngQ4Q1: 0.3,
};

const EDUCATION_OPTIONS: PredictRequest["educationLevel"][] = [
  "Uneducated",
  "High School",
  "College",
  "Graduate",
  "Post-Graduate",
  "Doctorate",
  "Unknown",
];

const MARITAL_OPTIONS: PredictRequest["maritalStatus"][] = [
  "Single",
  "Married",
  "Divorced",
  "Unknown",
];

const INCOME_OPTIONS: PredictRequest["incomeCategory"][] = [
  "Less than $40K",
  "$40K - $60K",
  "$60K - $80K",
  "$80K - $120K",
  "$120K +",
  "Unknown",
];

const SAMPLES: Array<{
  label: string;
  buttonText: string;
  tooltip: string;
  value: PredictRequest;
  tone: "success" | "warning" | "destructive";
}> = [
  {
    label: "Low-risk",
    buttonText: "Load low-risk sample",
    tooltip:
      "Mid-career, married, $60-80K income, healthy utilisation (~6%), active transactor. Should predict Existing with low churn probability.",
    value: SAMPLE_LOW_RISK,
    tone: "success",
  },
  {
    label: "Mid-risk",
    buttonText: "Load mid-risk sample",
    tooltip:
      "Borderline profile: moderate utilisation (~42%), slipping Q4 spend ratio (~0.75), 3 months inactive. Sits near the 0.5 threshold.",
    value: SAMPLE_MID_RISK,
    tone: "warning",
  },
  {
    label: "High-risk",
    buttonText: "Load high-risk sample",
    tooltip:
      "Divorced, low income, near-maxed utilisation (~80%), 5 months inactive, transactions cut in half QoQ. Should predict Attrited.",
    value: SAMPLE_HIGH_RISK,
    tone: "destructive",
  },
];

export function PredictForm() {
  const form = useForm<PredictRequest>({
    resolver: zodResolver(PredictRequestSchema),
    defaultValues: SAMPLE_LOW_RISK,
  });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const predict = usePredict();

  const onSubmit = handleSubmit((values) => predict.mutate(values));
  const errorMessage =
    predict.error && typeof predict.error === "object" && "message" in predict.error
      ? (predict.error as { message?: string }).message
      : undefined;

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
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((sample) => (
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
          </CardContent>
        </Card>

        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demographics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer age" error={formState.errors.customerAge?.message}>
                <Input type="number" {...register("customerAge", { valueAsNumber: true })} />
              </Field>
              <Field label="Gender" error={formState.errors.gender?.message}>
                <Select
                  value={watch("gender")}
                  onValueChange={(v) => setValue("gender", v as PredictRequest["gender"])}
                >
                  <SelectTrigger aria-label="Gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Dependents" error={formState.errors.dependentCount?.message}>
                <Input type="number" {...register("dependentCount", { valueAsNumber: true })} />
              </Field>
              <Field label="Education level" error={formState.errors.educationLevel?.message}>
                <Select
                  value={watch("educationLevel")}
                  onValueChange={(v) =>
                    setValue("educationLevel", v as PredictRequest["educationLevel"])
                  }
                >
                  <SelectTrigger aria-label="Education level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marital status" error={formState.errors.maritalStatus?.message}>
                <Select
                  value={watch("maritalStatus")}
                  onValueChange={(v) =>
                    setValue("maritalStatus", v as PredictRequest["maritalStatus"])
                  }
                >
                  <SelectTrigger aria-label="Marital status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Income category" error={formState.errors.incomeCategory?.message}>
                <Select
                  value={watch("incomeCategory")}
                  onValueChange={(v) =>
                    setValue("incomeCategory", v as PredictRequest["incomeCategory"])
                  }
                >
                  <SelectTrigger aria-label="Income category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account relationship</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Card category" error={formState.errors.cardCategory?.message}>
                <Select
                  value={watch("cardCategory")}
                  onValueChange={(v) =>
                    setValue("cardCategory", v as PredictRequest["cardCategory"])
                  }
                >
                  <SelectTrigger aria-label="Card category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Months on book" error={formState.errors.monthsOnBook?.message}>
                <Input type="number" {...register("monthsOnBook", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Months inactive (12mo)"
                error={formState.errors.monthsInactive12Mon?.message}
              >
                <Input
                  type="number"
                  {...register("monthsInactive12Mon", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Total relationships"
                error={formState.errors.totalRelationshipCount?.message}
              >
                <Input
                  type="number"
                  {...register("totalRelationshipCount", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Contacts (12mo)"
                error={formState.errors.contactsCount12Mon?.message}
              >
                <Input
                  type="number"
                  {...register("contactsCount12Mon", { valueAsNumber: true })}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transactional behaviour</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Credit limit" error={formState.errors.creditLimit?.message}>
                <Input type="number" {...register("creditLimit", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Total revolving bal"
                error={formState.errors.totalRevolvingBal?.message}
              >
                <Input
                  type="number"
                  {...register("totalRevolvingBal", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Total trans amount"
                error={formState.errors.totalTransAmt?.message}
              >
                <Input
                  type="number"
                  {...register("totalTransAmt", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Total trans count"
                error={formState.errors.totalTransCt?.message}
              >
                <Input
                  type="number"
                  {...register("totalTransCt", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Avg utilization (0-1)"
                error={formState.errors.avgUtilizationRatio?.message}
              >
                <Input
                  type="number"
                  step="0.001"
                  {...register("avgUtilizationRatio", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Q4/Q1 amount ratio (optional)"
                error={formState.errors.totalAmtChngQ4Q1?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="default 1.0 (no change)"
                  {...register("totalAmtChngQ4Q1", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Q4/Q1 count ratio (optional)"
                error={formState.errors.totalCtChngQ4Q1?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="default 1.0 (no change)"
                  {...register("totalCtChngQ4Q1", { valueAsNumber: true })}
                />
              </Field>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="submit"
              size="lg"
              disabled={predict.isPending}
              className="gap-2"
            >
              {predict.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Predicting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Predict
                </>
              )}
            </Button>
          </div>
        </form>

        {errorMessage ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </CardContent>
          </Card>
        ) : null}

        {predict.data ? <PredictResult data={predict.data} /> : null}
      </div>
    </TooltipProvider>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id })}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
