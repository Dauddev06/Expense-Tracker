"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { CATEGORIES } from "@/lib/constants";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { ChoiceChips } from "@/components/form/choice-chips";
import { PayFromField } from "@/components/form/pay-from-field";
import type { SpendingAccount } from "@/lib/accounts";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";
import { chapterEnd } from "@/lib/dates";

type Values = { title: string; amount: number; category: string; account: SpendingAccount; dueDate: string };

type Props = {
  id: string;
  repeating: boolean; // repeating items keep their day
  initial: Values;
};

// Edit ONE expected expense (one month only).
export function PlannedEditForm({ id, repeating, initial }: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today } = useToday();
  const latestDueDate = chapterEnd(today.slice(0, 7)); // no later than this month

  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ defaultValues: initial });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = await sendJson(`/api/expected/${id}`, "PATCH", {
      ...values,
      dueDate: repeating ? null : values.dueDate,
    });
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast("Saved");
    const item = data.item as { chapter: string };
    router.push(`/expected?chapter=${item.chapter}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />
      <div>
        <label htmlFor="title" className="label">
          What is it for?
        </label>
        <input
          id="title"
          className={`input ${errors.title ? "input-error" : ""}`}
          {...register("title", {
            required: "Please say what it is for",
            maxLength: { value: 120, message: "Keep it under 120 characters" },
          })}
        />
        {errors.title && <p className="error-text">{errors.title.message}</p>}
      </div>

      <AmountField
        id="amount"
        label="About how much?"
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      />

      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <ChoiceChips
            label="Category"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={CATEGORIES}
            error={errors.category?.message}
          />
        )}
      />

      <PayFromField control={control} error={errors.account?.message} />

      {!repeating && (
        <div>
          <label htmlFor="dueDate" className="label">
            When is it due?
          </label>
          <input
            id="dueDate"
            type="date"
            max={latestDueDate}
            className={`input max-w-[12rem] ${errors.dueDate ? "input-error" : ""}`}
            {...register("dueDate", { required: "Pick the day it is due" })}
          />
          {errors.dueDate && <p className="error-text">{errors.dueDate.message}</p>}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary flex-1 sm:flex-none">
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
