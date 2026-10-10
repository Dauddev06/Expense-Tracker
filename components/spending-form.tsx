"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CATEGORIES, toDateInputValue } from "@/lib/constants";

export type SpendingFormValues = {
  title: string;
  amount: number;
  category: string;
  spentOn: string;
  note: string;
};

type Props = {
  // "create" -> POST /api/spendings, "edit" -> PATCH /api/spendings/:id
  mode: "create" | "edit";
  spendingId?: string;
  defaultValues?: SpendingFormValues;
};

export function SpendingForm({ mode, spendingId, defaultValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // Work out "today" and "yesterday" ONCE, when the form first appears.
  // (Calling new Date() on every render would break React's purity rules.)
  const [{ today, yesterday }] = useState(() => {
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    return { today: toDateInputValue(now), yesterday: toDateInputValue(yest) };
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SpendingFormValues>({
    defaultValues: defaultValues ?? {
      title: "",
      amount: undefined as unknown as number, // empty input to start with
      category: "food",
      spentOn: today,
      note: "",
    },
  });

  // Subscribe to ONE field: this component re-renders when the date changes
  const spentOn = useWatch({ control, name: "spentOn" });

  async function onSubmit(values: SpendingFormValues) {
    setServerError(null);

    const url =
      mode === "create" ? "/api/spendings" : `/api/spendings/${spendingId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.fieldErrors) {
        for (const [field, messages] of Object.entries(data.fieldErrors)) {
          setError(field as keyof SpendingFormValues, {
            message: (messages as string[])[0],
          });
        }
      }
      setServerError(data.message ?? "Could not save");
      return;
    }

    if (mode === "create") {
      reset(); // clear the form back to its default values
      router.push(`/spendings/${data.spending.id}`);
    } else {
      router.push(`/spendings/${spendingId}`);
    }
    router.refresh(); // re-fetch Server Components so lists/totals update
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Title + Amount side by side on larger screens */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="label">
            What did you spend on?
          </label>
          <input
            id="title"
            autoFocus
            className={`input ${errors.title ? "input-error" : ""}`}
            placeholder="e.g. Lunch with friends"
            {...register("title", {
              required: "Title is required",
              maxLength: {
                value: 120,
                message: "Keep it under 120 characters",
              },
            })}
          />
          {errors.title && <p className="error-text">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className={`input ${errors.amount ? "input-error" : ""}`}
            placeholder="0.00"
            {...register("amount", {
              valueAsNumber: true, // give us a number, not the string "12.5"
              required: "Amount is required",
              validate: (v) =>
                (Number.isFinite(v) && v > 0) ||
                "Amount must be greater than 0",
            })}
          />
          {errors.amount && (
            <p className="error-text">{errors.amount.message}</p>
          )}
        </div>
      </div>

      {/* Category chips: a CUSTOM component, so we use <Controller> instead of register */}
      <div>
        <span className="label">Category</span>
        <Controller
          name="category"
          control={control}
          rules={{ required: "Pick a category" }}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const selected = field.value === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => field.onChange(c.value)}
                    onBlur={field.onBlur}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.category && (
          <p className="error-text">{errors.category.message}</p>
        )}
      </div>

      {/* Date with quick "Today / Yesterday" buttons using setValue */}
      <div>
        <label htmlFor="spentOn" className="label">
          Date
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="spentOn"
            type="date"
            max={today}
            className={`input max-w-[12rem] ${errors.spentOn ? "input-error" : ""}`}
            {...register("spentOn", { required: "Pick a date" })}
          />
          <button
            type="button"
            className={spentOn === today ? "btn-primary" : "btn-secondary"}
            onClick={() =>
              setValue("spentOn", today, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            Today
          </button>
          <button
            type="button"
            className={spentOn === yesterday ? "btn-primary" : "btn-secondary"}
            onClick={() =>
              setValue("spentOn", yesterday, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            Yesterday
          </button>
        </div>
        {errors.spentOn && (
          <p className="error-text">{errors.spentOn.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="note" className="label">
          Note <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          className="input"
          placeholder="Anything you want to remember about this"
          {...register("note")}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || (mode === "edit" && !isDirty)}
          className="btn-primary"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Add spending"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
