"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useToast } from "@/components/toast";
import { FormError } from "@/components/form/form-error";
import { PercentField, percentRules } from "@/components/form/percent-field";

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
        <PercentField
          id="sadqaPercent"
          label="Part of each income to give as Sadqa"
          registration={register("sadqaPercent", percentRules)}
          error={errors.sadqaPercent?.message}
          value={percent}
          quickPicks={QUICK_PICKS}
          onPick={(value) => setValue("sadqaPercent", value, { shouldValidate: true })}
        />
        {!errors.sadqaPercent && Number.isFinite(percent) && (
          <p className="hint-text">
            Example: on an income of {formatMoney(100000)},{" "}
            {formatMoney(Math.round(100000 * percent) / 100)} is added to your Sadqa to give.
          </p>
        )}
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
