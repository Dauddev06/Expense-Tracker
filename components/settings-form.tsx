"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { FormError } from "@/components/form/form-error";

const QUICK_PICKS = [0, 2.5, 5, 10];

type Props = {
  sadqaPercent: number;
  submitLabel: string;
  onSaved?: (sadqaPercent: number) => void; // the welcome flow continues instead of refreshing
};

// "What % of your income should go to Sadqa?"
export function SettingsForm({ sadqaPercent, submitLabel, onSaved }: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<{ sadqaPercent: number }>({ defaultValues: { sadqaPercent } });
  const percent = useWatch({ control, name: "sadqaPercent" });

  async function onSubmit(values: { sadqaPercent: number }) {
    setServerError(null);
    const { ok, data } = await sendJson("/api/settings", "PUT", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast(`Sadqa set to ${values.sadqaPercent}% of income`);
    if (onSaved) {
      onSaved(values.sadqaPercent);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <div>
        <label htmlFor="sadqaPercent" className="label">
          Part of each income to set aside for Sadqa
        </label>
        <div className="relative max-w-[10rem]">
          <input
            id="sadqaPercent"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className={`input-amount pr-10 pl-4 ${errors.sadqaPercent ? "input-error" : ""}`}
            {...register("sadqaPercent", {
              setValueAs: (v: unknown) =>
                typeof v === "number" ? v : String(v ?? "").trim() === "" ? NaN : Number(v),
              validate: (v) =>
                (Number.isFinite(v) && v >= 0 && v <= 100) || "Enter a number from 0 to 100",
            })}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xl font-semibold text-muted"
          >
            %
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_PICKS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={percent === value}
              className={`chip ${percent === value ? "chip-selected" : ""}`}
              onClick={() => setValue("sadqaPercent", value, { shouldValidate: true })}
            >
              {value}%
            </button>
          ))}
        </div>
        {errors.sadqaPercent ? (
          <p className="error-text">{errors.sadqaPercent.message}</p>
        ) : (
          Number.isFinite(percent) && (
            <p className="hint-text">
              Example: on an income of {formatMoney(100000)},{" "}
              {formatMoney(Math.round(100000 * percent) / 100)} goes to Sadqa.
            </p>
          )
        )}
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
