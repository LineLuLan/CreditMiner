"use client";

import * as React from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
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
import type { PredictRequest } from "@/types/api.types";

export const SAMPLE_LOW_RISK: PredictRequest = {
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
  totalAmtChngQ4Q1: 1,
  totalCtChngQ4Q1: 1,
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

export const PREDICT_SAMPLES: Array<{
  label: string;
  buttonText: string;
  tooltip: string;
  value: PredictRequest;
  tone: "success" | "warning" | "destructive";
}> = [
  {
    label: "Low-risk",
    buttonText: "Load low-risk sample",
    tooltip: "Healthy utilization and frequent activity indicate low churn risk.",
    value: SAMPLE_LOW_RISK,
    tone: "success",
  },
  {
    label: "Mid-risk",
    buttonText: "Load mid-risk sample",
    tooltip: "Moderate utilization and lower spending create a borderline churn score.",
    value: SAMPLE_MID_RISK,
    tone: "warning",
  },
  {
    label: "High-risk",
    buttonText: "Load high-risk sample",
    tooltip: "High utilization, low activity, and fewer transactions indicate high churn risk.",
    value: SAMPLE_HIGH_RISK,
    tone: "destructive",
  },
];

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

export function PredictFields({
  register,
  watch,
  setValue,
  errors,
}: {
  register: UseFormRegister<PredictRequest>;
  watch: UseFormWatch<PredictRequest>;
  setValue: UseFormSetValue<PredictRequest>;
  errors: FieldErrors<PredictRequest>;
}) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Demographics</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer age" error={errors.customerAge?.message}>
            <Input type="number" {...register("customerAge", { valueAsNumber: true })} />
          </Field>
          <Field label="Gender" error={errors.gender?.message}>
            <Select value={watch("gender")} onValueChange={(value) => setValue("gender", value as PredictRequest["gender"])}>
              <SelectTrigger aria-label="Gender"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Dependents" error={errors.dependentCount?.message}>
            <Input type="number" {...register("dependentCount", { valueAsNumber: true })} />
          </Field>
          <Field label="Education level" error={errors.educationLevel?.message}>
            <Select value={watch("educationLevel")} onValueChange={(value) => setValue("educationLevel", value as PredictRequest["educationLevel"])}>
              <SelectTrigger aria-label="Education level"><SelectValue /></SelectTrigger>
              <SelectContent>{EDUCATION_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Marital status" error={errors.maritalStatus?.message}>
            <Select value={watch("maritalStatus")} onValueChange={(value) => setValue("maritalStatus", value as PredictRequest["maritalStatus"])}>
              <SelectTrigger aria-label="Marital status"><SelectValue /></SelectTrigger>
              <SelectContent>{MARITAL_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Income category" error={errors.incomeCategory?.message}>
            <Select value={watch("incomeCategory")} onValueChange={(value) => setValue("incomeCategory", value as PredictRequest["incomeCategory"])}>
              <SelectTrigger aria-label="Income category"><SelectValue /></SelectTrigger>
              <SelectContent>{INCOME_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Account relationship</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Card category" error={errors.cardCategory?.message}>
            <Select value={watch("cardCategory")} onValueChange={(value) => setValue("cardCategory", value as PredictRequest["cardCategory"])}>
              <SelectTrigger aria-label="Card category"><SelectValue /></SelectTrigger>
              <SelectContent>{["Blue", "Silver", "Gold", "Platinum"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Months on book" error={errors.monthsOnBook?.message}>
            <Input type="number" {...register("monthsOnBook", { valueAsNumber: true })} />
          </Field>
          <Field label="Months inactive (12mo)" error={errors.monthsInactive12Mon?.message}>
            <Input type="number" {...register("monthsInactive12Mon", { valueAsNumber: true })} />
          </Field>
          <Field label="Total relationships" error={errors.totalRelationshipCount?.message}>
            <Input type="number" {...register("totalRelationshipCount", { valueAsNumber: true })} />
          </Field>
          <Field label="Contacts (12mo)" error={errors.contactsCount12Mon?.message}>
            <Input type="number" {...register("contactsCount12Mon", { valueAsNumber: true })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Transactional behaviour</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Credit limit" error={errors.creditLimit?.message}>
            <Input type="number" {...register("creditLimit", { valueAsNumber: true })} />
          </Field>
          <Field label="Total revolving bal" error={errors.totalRevolvingBal?.message}>
            <Input type="number" {...register("totalRevolvingBal", { valueAsNumber: true })} />
          </Field>
          <Field label="Total trans amount" error={errors.totalTransAmt?.message}>
            <Input type="number" {...register("totalTransAmt", { valueAsNumber: true })} />
          </Field>
          <Field label="Total trans count" error={errors.totalTransCt?.message}>
            <Input type="number" {...register("totalTransCt", { valueAsNumber: true })} />
          </Field>
          <Field label="Avg utilization (0-1)" error={errors.avgUtilizationRatio?.message}>
            <Input type="number" step="0.001" {...register("avgUtilizationRatio", { valueAsNumber: true })} />
          </Field>
          <Field label="Q4/Q1 amount ratio (optional)" error={errors.totalAmtChngQ4Q1?.message}>
            <Input type="number" step="0.01" placeholder="default 1.0 (no change)" {...register("totalAmtChngQ4Q1", { valueAsNumber: true })} />
          </Field>
          <Field label="Q4/Q1 count ratio (optional)" error={errors.totalCtChngQ4Q1?.message}>
            <Input type="number" step="0.01" placeholder="default 1.0 (no change)" {...register("totalCtChngQ4Q1", { valueAsNumber: true })} />
          </Field>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id })}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
