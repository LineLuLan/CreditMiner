"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

/**
 * Form for {@code POST /api/predict}.
 *
 * <p>Wired to React Hook Form + Zod schema and the {@link usePredict} mutation.
 * Result rendering delegated to {@link PredictResult}.</p>
 */
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
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Customer age" error={formState.errors.customerAge?.message}>
              <Input type="number" {...register("customerAge", { valueAsNumber: true })} />
            </Field>
            <Field label="Gender" error={formState.errors.gender?.message}>
              <Select
                value={watch("gender")}
                onValueChange={(v) => setValue("gender", v as PredictRequest["gender"])}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Card category" error={formState.errors.cardCategory?.message}>
              <Select
                value={watch("cardCategory")}
                onValueChange={(v) =>
                  setValue("cardCategory", v as PredictRequest["cardCategory"])
                }
              >
                <SelectTrigger>
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
            <Field label="Months inactive (12mo)" error={formState.errors.monthsInactive12Mon?.message}>
              <Input
                type="number"
                {...register("monthsInactive12Mon", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Total relationships" error={formState.errors.totalRelationshipCount?.message}>
              <Input
                type="number"
                {...register("totalRelationshipCount", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Contacts (12mo)" error={formState.errors.contactsCount12Mon?.message}>
              <Input
                type="number"
                {...register("contactsCount12Mon", { valueAsNumber: true })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Credit limit" error={formState.errors.creditLimit?.message}>
              <Input type="number" {...register("creditLimit", { valueAsNumber: true })} />
            </Field>
            <Field label="Total revolving bal" error={formState.errors.totalRevolvingBal?.message}>
              <Input type="number" {...register("totalRevolvingBal", { valueAsNumber: true })} />
            </Field>
            <Field label="Total trans amount" error={formState.errors.totalTransAmt?.message}>
              <Input type="number" {...register("totalTransAmt", { valueAsNumber: true })} />
            </Field>
            <Field label="Total trans count" error={formState.errors.totalTransCt?.message}>
              <Input type="number" {...register("totalTransCt", { valueAsNumber: true })} />
            </Field>
            <Field label="Avg utilization (0-1)" error={formState.errors.avgUtilizationRatio?.message}>
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

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={predict.isPending}>
            {predict.isPending ? "Predicting…" : "Predict"}
          </Button>
          <Button type="button" variant="outline" onClick={() => reset(SAMPLE_LOW_RISK)}>
            Load low-risk sample
          </Button>
          <Button type="button" variant="outline" onClick={() => reset(SAMPLE_HIGH_RISK)}>
            Load high-risk sample
          </Button>
        </div>
      </form>

      {errorMessage ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {predict.data ? <PredictResult data={predict.data} /> : null}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
