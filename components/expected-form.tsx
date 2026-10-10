"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CATEGORIES } from "@/lib/constants";
import { chapterEnd, chapterLabel, chapterStart } from "@/lib/dates";
import { FREQUENCY_OPTIONS, frequencyLabel, type FrequencyChoice } from "@/lib/expected-input";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { ChoiceChips } from "@/components/form/choice-chips";
import { PayFromField } from "@/components/form/pay-from-field";
import { isSpendingAccount, type SpendingAccount } from "@/lib/accounts";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Values = {
  title: string;
  amount: number;
  category: string;
  account: SpendingAccount;
  frequency: FrequencyChoice;
  dueDate: string;
};

const SCHEDULE_HINT: Record<FrequencyChoice, string> = {
  once: "",
  weekly: "4 times a month: on the 1st, 8th, 15th and 22nd.",
  biweekly: "2 times a month: on the 1st and 15th.",
  monthly: "Once a month, on the 1st.",
};

// "Add expected expense": something you plan to pay this month (or every month).
export function ExpectedForm({ chapter, presetAccount }: { chapter: string; presetAccount?: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today } = useToday();

  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      title: "",
      amount: undefined as unknown as number,
      category: "bills",
      account: isSpendingAccount(presetAccount) ? presetAccount : "current",
      frequency: "once",
      // This month -> today. Another month -> the 1st of that month.
      dueDate: chapter === today.slice(0, 7) ? today : `${chapter}-01`,
    },
  });
  const frequency = useWatch({ control, name: "frequency" });

  async function onSubmit(values: Values) {
    setServerError(null);
    const once = values.frequency === "once";
    const { ok, data } = await sendJson("/api/expected", "POST", {
      ...values,
      dueDate: once ? values.dueDate : null,
      startChapter: once ? null : chapter,
    });
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    const savedChapter = data.chapter as string;
    showToast(
      once
        ? `Added to ${chapterLabel(savedChapter)}`
        : `Added. It repeats ${frequencyLabel(values.frequency).toLowerCase()}`,
    );
    router.push(`/expected?chapter=${savedChapter}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      <div>
        <label htmlFor="title" className="label">
          What do you need to pay for?
        </label>
        <input
          id="title"
          autoFocus
          className={`input ${errors.title ? "input-error" : ""}`}
          placeholder="e.g. Rent, Electricity bill, Gym"
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
        rules={{ required: "Pick a category" }}
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

      <div>
        <Controller
          name="frequency"
          control={control}
          render={({ field }) => (
            <ChoiceChips
              label="How often?"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={FREQUENCY_OPTIONS}
              error={errors.frequency?.message}
            />
          )}
        />
        {frequency !== "once" && (
          <p className="hint-text">
            {SCHEDULE_HINT[frequency]} Starting {chapterLabel(chapter)}.
          </p>
        )}
      </div>

      {frequency === "once" && (
        <div>
          <label htmlFor="dueDate" className="label">
            When is it due?
          </label>
          <input
            id="dueDate"
            type="date"
            min={chapterStart(chapter)}
            max={chapterEnd(chapter)}
            className={`input max-w-[12rem] ${errors.dueDate ? "input-error" : ""}`}
            {...register("dueDate", { required: "Pick the day it is due" })}
          />
          {errors.dueDate && <p className="error-text">{errors.dueDate.message}</p>}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 sm:flex-none">
          {isSubmitting ? "Saving..." : "Add expected expense"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
