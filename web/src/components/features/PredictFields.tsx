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
import { PredictMoneyInput } from "./PredictMoneyInput";
import { PAY_STATUS_OPTIONS } from "@/lib/constants";

export const SAMPLE_PROFILE: PredictRequest = {
  limitBal: 200000,
  sex: "Female",
  education: "University",
  marriage: "Single",
  age: 35,
  pay1: 0,
  pay2: 0,
  pay3: 0,
  pay4: 0,
  pay5: 0,
  pay6: 0,
  billAmt1: 50000,
  billAmt2: 48000,
  billAmt3: 46000,
  billAmt4: 44000,
  billAmt5: 42000,
  billAmt6: 40000,
  payAmt1: 5000,
  payAmt2: 5000,
  payAmt3: 5000,
  payAmt4: 5000,
  payAmt5: 5000,
  payAmt6: 5000,
};

const EDUCATION_OPTIONS: PredictRequest["education"][] = [
  "Graduate",
  "University",
  "HighSchool",
  "Other",
];

const MARRIAGE_OPTIONS: PredictRequest["marriage"][] = ["Married", "Single", "Other"];

const STATUS_FIELDS = [
  { name: "pay1", label: "September 2005" },
  { name: "pay2", label: "August 2005" },
  { name: "pay3", label: "July 2005" },
  { name: "pay4", label: "June 2005" },
  { name: "pay5", label: "May 2005" },
  { name: "pay6", label: "April 2005" },
] as const;

const BILL_FIELDS = [
  { name: "billAmt1", label: "September 2005" },
  { name: "billAmt2", label: "August 2005" },
  { name: "billAmt3", label: "July 2005" },
  { name: "billAmt4", label: "June 2005" },
  { name: "billAmt5", label: "May 2005" },
  { name: "billAmt6", label: "April 2005" },
] as const;

const PAYMENT_FIELDS = [
  { name: "payAmt1", label: "September 2005" },
  { name: "payAmt2", label: "August 2005" },
  { name: "payAmt3", label: "July 2005" },
  { name: "payAmt4", label: "June 2005" },
  { name: "payAmt5", label: "May 2005" },
  { name: "payAmt6", label: "April 2005" },
] as const;

type AmountFieldName = (typeof BILL_FIELDS)[number]["name"] | (typeof PAYMENT_FIELDS)[number]["name"];

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
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Credit limit (NT$)" error={errors.limitBal?.message}>
            <PredictMoneyInput value={watch("limitBal")} onValueChange={(value) => setValue("limitBal", value, { shouldValidate: true, shouldDirty: true })} />
          </Field>
          <Field label="Sex" error={errors.sex?.message}>
            <Select value={watch("sex")} onValueChange={(value) => setValue("sex", value as PredictRequest["sex"], { shouldValidate: true })}>
              <SelectTrigger aria-label="Sex"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Education" error={errors.education?.message}>
            <Select value={watch("education")} onValueChange={(value) => setValue("education", value as PredictRequest["education"], { shouldValidate: true })}>
              <SelectTrigger aria-label="Education"><SelectValue /></SelectTrigger>
              <SelectContent>{EDUCATION_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === "HighSchool" ? "High school" : option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Marriage" error={errors.marriage?.message}>
            <Select value={watch("marriage")} onValueChange={(value) => setValue("marriage", value as PredictRequest["marriage"], { shouldValidate: true })}>
              <SelectTrigger aria-label="Marriage"><SelectValue /></SelectTrigger>
              <SelectContent>{MARRIAGE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Age" error={errors.age?.message}>
            <Input type="number" min={18} {...register("age", { valueAsNumber: true })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Repayment status</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATUS_FIELDS.map((field) => (
            <Field key={field.name} label={field.label} error={errors[field.name]?.message}>
              <Select value={String(watch(field.name))} onValueChange={(value) => setValue(field.name, Number(value), { shouldValidate: true })}>
                <SelectTrigger aria-label={field.label}><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          ))}
        </CardContent>
      </Card>

      <AmountFields title="Bill amounts" fields={BILL_FIELDS} watch={watch} setValue={setValue} errors={errors} allowNegative />
      <AmountFields title="Payment amounts" fields={PAYMENT_FIELDS} watch={watch} setValue={setValue} errors={errors} />
    </>
  );
}

function AmountFields({ title, fields, watch, setValue, errors, allowNegative = false }: {
  title: string;
  fields: ReadonlyArray<{ name: AmountFieldName; label: string }>;
  watch: UseFormWatch<PredictRequest>;
  setValue: UseFormSetValue<PredictRequest>;
  errors: FieldErrors<PredictRequest>;
  allowNegative?: boolean;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title} (NT$)</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <Field key={field.name} label={field.label} error={errors[field.name]?.message}>
            <PredictMoneyInput value={watch(field.name)} allowNegative={allowNegative} onValueChange={(value) => setValue(field.name, value, { shouldValidate: true, shouldDirty: true })} />
          </Field>
        ))}
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  const id = React.useId();
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id })}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
