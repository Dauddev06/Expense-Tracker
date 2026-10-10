"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { CATEGORIES } from "@/lib/constants";
import { FREQUENCY_OPTIONS } from "@/lib/expected-input";
import type { Frequency } from "@/lib/db/entities/RecurringExpense";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { ChoiceChips } from "@/components/form/choice-chips";
import { PayFromField } from "@/components/form/pay-from-field";
import type { SpendingAccount } from "@/lib/accounts";
import { FormError } from "@/components/form/form-error";

type Values = {
  title: string;
  amount: number;
  category: string;
  account: SpendingAccount;
  frequency: Frequency;
  active: "on" | "paused";
};

// Repeating choices only (no "One time")
const REPEAT_OPTIONS = FREQUENCY_OPTIONS.filter((f) => f.value !== "once") as {
  value: Frequency;
  label: string;
}[];

// Edit a repeating expense (the template), or pause it.
export function RecurringForm({ id, initial }: { id: string; initial: Values }) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

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
    const { ok, data } = await sendJson(`/api/recurring/${id}`, "PATCH", {
      ...values,
      active: values.active === "on",
    });
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast("Saved");
    router.push("/expected/recurring");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />
      <p className="rounded-xl bg-surface-2 px-3 py-2 text-ink-2">
        Changes apply from today on. Paid items and earlier days stay as they are.
      </p>

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
        label="About how much each time?"
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      />

      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <ChoiceChips label="Category" value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={CATEGORIES} />
        )}
      />

      <PayFromField control={control} error={errors.account?.message} />

      <Controller
        name="frequency"
        control={control}
        render={({ field }) => (
          <ChoiceChips
            label="How often?"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={REPEAT_OPTIONS}
            error={errors.frequency?.message}
          />
        )}
      />

      <Controller
        name="active"
        control={control}
        render={({ field }) => (
          <ChoiceChips
            label="Status"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={[
              { value: "on", label: "On" },
              { value: "paused", label: "Paused" },
            ]}
          />
        )}
      />

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
