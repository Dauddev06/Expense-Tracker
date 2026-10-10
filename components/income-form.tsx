"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import type { Balances } from "@/lib/accounts";
import { chapterLabel } from "@/lib/dates";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { usePrefetch } from "@/components/form/use-prefetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { ChoiceChips } from "@/components/form/choice-chips";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Values = {
  title: string;
  amount: number;
  received: "yes" | "no";
  receivedOn: string;
};

type Props = {
  chapter: string;
  balances: Balances;
  sadqaPercent: number; // the % that applies when it is received
  incomeId?: string; // set when editing
  initial?: { title: string; amount: number; received: boolean; receivedOn: string | null };
  submitLabel: string;
  onSaved?: () => void; // the welcome flow continues instead of navigating
};

const sadqaFor = (amount: number, percent: number) => Math.round(amount * percent) / 100;

export function IncomeForm({ chapter, balances, sadqaPercent, incomeId, initial, submitLabel, onSaved }: Props) {
  const router = useRouter();
  usePrefetch(`/income?chapter=${chapter}`); // where "Save" goes
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      title: initial?.title ?? "Salary",
      amount: initial?.amount ?? (undefined as unknown as number),
      received: initial?.received ? "yes" : "no",
      receivedOn: initial?.receivedOn ?? today,
    },
  });

  const [amount, received, receivedOn] = useWatch({
    control,
    name: ["amount", "received", "receivedOn"],
  });

  // When editing an income that was already received, its money is already
  // in the balances. Take it out first so the preview shows the real change.
  const startBalances = { ...balances };
  if (initial?.received) {
    const oldSadqa = sadqaFor(initial.amount, sadqaPercent);
    startBalances.current -= initial.amount - oldSadqa;
    startBalances.sadqa -= oldSadqa;
  }
  const sadqa = Number.isFinite(amount) ? sadqaFor(amount, sadqaPercent) : 0;

  async function onSubmit(values: Values) {
    setServerError(null);
    const body = {
      chapter,
      title: values.title,
      amount: values.amount,
      received: values.received === "yes",
      receivedOn: values.received === "yes" ? values.receivedOn : null,
    };
    const { ok, data } = incomeId
      ? await sendJson(`/api/income/${incomeId}`, "PATCH", body)
      : await sendJson("/api/income", "POST", body);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }

    if (incomeId) showToast("Saved");
    else if (body.received)
      showToast(`Received ${formatMoney(values.amount)} into Current`);
    else showToast("Income added");

    if (onSaved) {
      onSaved();
      return;
    }
    router.push(`/income?chapter=${chapter}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />
      <p className="text-muted">
        For <strong className="text-ink">{chapterLabel(chapter)}</strong>. Income always goes
        into Current.
      </p>

      <div>
        <label htmlFor="title" className="label">
          What is it?
        </label>
        <input
          id="title"
          className={`input ${errors.title ? "input-error" : ""}`}
          placeholder="e.g. Salary"
          {...register("title", {
            required: "Give it a name, like Salary",
            maxLength: { value: 120, message: "Keep it under 120 characters" },
          })}
        />
        {errors.title && <p className="error-text">{errors.title.message}</p>}
      </div>

      <AmountField
        id="amount"
        label="How much?"
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      />

      <Controller
        name="received"
        control={control}
        render={({ field }) => (
          <ChoiceChips
            label="Have you received it yet?"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={[
              { value: "yes", label: "Yes, it's here" },
              { value: "no", label: "Not yet" },
            ]}
          />
        )}
      />

      {received === "yes" && (
        <>
          <DateField
            id="receivedOn"
            label="When did it arrive?"
            registration={register("receivedOn", { required: "Pick the day you received it" })}
            error={errors.receivedOn?.message}
            value={receivedOn}
            today={today}
            yesterday={yesterday}
            onPick={(date) => setValue("receivedOn", date, { shouldValidate: true })}
          />
          {sadqa > 0 && (
            <p className="rounded-xl bg-positive-soft px-3 py-2 text-positive">
              {formatMoney(sadqa)} ({sadqaPercent}%) will be set aside for Sadqa.
            </p>
          )}
          <EffectPreview
            balances={startBalances}
            changes={[
              { account: "current", delta: amount - sadqa },
              { account: "sadqa", delta: sadqa },
            ]}
          />
        </>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 sm:flex-none">
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {!onSaved && (
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
