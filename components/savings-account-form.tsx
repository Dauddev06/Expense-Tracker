"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { usePrefetch } from "@/components/form/use-prefetch";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { FormError } from "@/components/form/form-error";

type Values = { name: string; startingAmount: number };

type Props =
  | { mode: "create" }
  | { mode: "rename"; accountKey: string; name: string };

// Open another savings account (name + what's in it now), or rename one.
export function SavingsAccountForm(props: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const creating = props.mode === "create";
  usePrefetch(creating ? null : `/accounts/${props.accountKey}`); // where "Save" goes when renaming

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    defaultValues: {
      name: creating ? "" : props.name,
      startingAmount: 0,
    },
  });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = creating
      ? await sendJson("/api/savings-accounts", "POST", values)
      : await sendJson(`/api/savings-accounts/${props.accountKey}`, "PATCH", { name: values.name });
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    const saved = data.account as { key: string; name: string };
    showToast(
      creating
        ? values.startingAmount > 0
          ? `${saved.name} opened with ${formatMoney(values.startingAmount)}`
          : `${saved.name} opened`
        : "Saved",
    );
    router.push(`/accounts/${saved.key}`);
    // The list of accounts lives in the layout (for every form's account
    // buttons), so it has to be reloaded too.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={serverError} />

      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input
          id="name"
          autoFocus
          className={`input ${errors.name ? "input-error" : ""}`}
          placeholder="e.g. Emergency fund, Hajj, New phone"
          {...register("name", {
            required: "Give it a name, e.g. Emergency fund",
            maxLength: { value: 60, message: "Keep the name under 60 characters" },
          })}
        />
        {errors.name && <p className="error-text">{errors.name.message}</p>}
      </div>

      {creating && (
        <AmountField
          id="startingAmount"
          label="How much is in it right now?"
          registration={register("startingAmount", amountRules({ allowZero: true }))}
          error={errors.startingAmount?.message}
        >
          <p className="hint-text">
            0 is fine. To fill it from another account later, use Move money.
          </p>
        </AmountField>
      )}

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting || (!creating && !isDirty)}
          className="btn-primary flex-1 sm:flex-none"
        >
          {isSubmitting ? "Saving..." : creating ? "Open account" : "Save name"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
