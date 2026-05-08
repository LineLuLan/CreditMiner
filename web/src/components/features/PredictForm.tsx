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
};

/**
 * Form for {@code POST /api/predict}.
 *
 * <p>Detailed scaffolding — fully wired to React Hook Form + Zod schema and
 * the {@link usePredict} mutation. Only the result-display section is a stub
 * for FE-73..77.</p>
 */
export function PredictForm() {
  const form = useForm<PredictRequest>({
    resolver: zodResolver(PredictRequestSchema),
    defaultValues: SAMPLE_LOW_RISK,
  });
  const { register, handleSubmit, reset, formState } = form;
  const predict = usePredict();

  const onSubmit = handleSubmit((values) => predict.mutate(values));

  return (
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
              onValueChange={(v) => form.setValue("gender", v as "M" | "F")}
              defaultValue={form.getValues("gender")}
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
          {/* TODO FE-70: education / marital / income selects with full enum lists. */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Card category" error={formState.errors.cardCategory?.message}>
            <Select
              onValueChange={(v) => form.setValue("cardCategory", v as PredictRequest["cardCategory"])}
              defaultValue={form.getValues("cardCategory")}
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
            <Input type="number" {...register("monthsInactive12Mon", { valueAsNumber: true })} />
          </Field>
          <Field label="Total relationships" error={formState.errors.totalRelationshipCount?.message}>
            <Input type="number" {...register("totalRelationshipCount", { valueAsNumber: true })} />
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={predict.isPending}>
          {predict.isPending ? "Predicting…" : "Predict"}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset(SAMPLE_LOW_RISK)}>
          Load sample customer
        </Button>
      </div>

      {/* TODO FE-73..77: probability gauge, label badge, top-3 features bar, cluster card, recommendation. */}
      {predict.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(predict.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </form>
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
