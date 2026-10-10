"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { SPENDING_ACCOUNTS, type Balances, type SpendingAccount } from "@/lib/accounts";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { AmountField, amountRules } from "@/components/form/amount-field";
import { AccountPicker } from "@/components/form/account-picker";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Item = { id: string; title: string; amount: number };
type Values = { amount: number; account: SpendingAccount; paidOn: string };

// "Mark as paid" -> a small pop-up to confirm what it really cost.
export function MarkPaidButton({ item, balances }: { item: Item; balances: Balances }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Mark as paid
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Pay ${item.title}`}>
        <PayForm item={item} balances={balances} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function PayForm({ item, balances, onDone }: { item: Item; balances: Balances; onDone: () => void }) {
  const router = useRouter();
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
    defaultValues: { amount: item.amount, account: "current", paidOn: today },
  });
  const [amount, account, paidOn] = useWatch({ control, name: ["amount", "account", "paidOn"] });

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = await sendJson(`/api/expected/${item.id}/pay`, "POST", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast(`Paid ${formatMoney(values.amount)} for ${item.title}`);
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <AmountField
        id="pay-amount"
        label="How much did it cost?"
        registration={register("amount", amountRules())}
        error={errors.amount?.message}
      />
      <Controller
        name="account"
        control={control}
        rules={{ required: "Pick where the money came from" }}
        render={({ field }) => (
          <AccountPicker
            label="Paid from"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={SPENDING_ACCOUNTS}
            balances={balances}
            error={errors.account?.message}
          />
        )}
      />
      <DateField
        id="paidOn"
        label="When?"
        registration={register("paidOn", { required: "Pick the day you paid" })}
        error={errors.paidOn?.message}
        value={paidOn}
        today={today}
        yesterday={yesterday}
        max={today}
        onPick={(date) => setValue("paidOn", date, { shouldValidate: true })}
      />
      <EffectPreview balances={balances} changes={[{ account, delta: -amount }]} />
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Saving..." : "Mark as paid"}
      </button>
    </form>
  );
}
