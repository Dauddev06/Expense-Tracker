"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import { accountLabel, savingsAccountsOf, type AccountId, type Balances } from "@/lib/accounts";
import type { SettingsDTO } from "@/lib/services/settings.service";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { useAccounts } from "@/components/accounts-context";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { AccountPicker } from "@/components/form/account-picker";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { PercentField, percentRules } from "@/components/form/percent-field";
import { useToday } from "@/components/form/use-today";

type Props = {
  income: { id: string; title: string; amount: number };
  settings: SettingsDTO; // Sadqa % + the usual savings % and account
  balances: Balances;
};

type Values = { receivedOn: string; savingsPercent: number; savingsAccount: string };

const partOf = (amount: number, percent: number) =>
  Number.isFinite(percent) ? Math.round(amount * percent) / 100 : 0;

// "Mark as received" -> a small pop-up: when did it arrive, and how much of it
// to save (filled in from Settings, can be changed for this income only).
export function ReceiveIncomeButton({ income, settings, balances }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Mark as received
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${income.title} received`}>
        <ReceiveForm income={income} settings={settings} balances={balances} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function ReceiveForm({ income, settings, balances, onDone }: Props & { onDone: () => void }) {
  const router = useRouter();
  const showToast = useToast();
  const accounts = useAccounts();
  const savingsOptions = savingsAccountsOf(accounts);
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();
  const sadqa = partOf(income.amount, settings.sadqaPercent);

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
      receivedOn: today,
      savingsPercent: settings.savingsPercent,
      savingsAccount: savingsOptions.includes(settings.savingsAccount as never) ? settings.savingsAccount : "savings",
    },
  });
  const [receivedOn, savingsPercent, savingsAccount] = useWatch({
    control,
    name: ["receivedOn", "savingsPercent", "savingsAccount"],
  });
  const saved = partOf(income.amount, savingsPercent);

  async function onSubmit(values: Values) {
    setServerError(null);
    const { ok, data } = await sendJson(`/api/income/${income.id}/receive`, "POST", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast(
      saved > 0
        ? `Received ${formatMoney(income.amount)}, ${formatMoney(saved)} saved into ${accountLabel(values.savingsAccount, accounts)}`
        : `Received ${formatMoney(income.amount)} into Current`,
    );
    onDone();
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <p className="text-ink-2">
        {formatMoney(income.amount)} goes into Current.
        {sadqa > 0 && ` ${formatMoney(sadqa)} (${settings.sadqaPercent}%) of it is set aside for Sadqa.`}
      </p>
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

      <PercentField
        id="savingsPercent"
        label="How much of it to save?"
        registration={register("savingsPercent", percentRules)}
        error={errors.savingsPercent?.message}
        value={savingsPercent}
        quickPicks={[0, 5, 10, 20]}
        onPick={(v) => setValue("savingsPercent", v, { shouldValidate: true })}
      />
      {savingsPercent > 0 && (
        <Controller
          name="savingsAccount"
          control={control}
          render={({ field }) => (
            <AccountPicker
              label="Save it into"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={savingsOptions}
              balances={balances}
              error={errors.savingsAccount?.message}
            />
          )}
        />
      )}

      <EffectPreview
        balances={balances}
        changes={[
          { account: "current", delta: income.amount - sadqa - saved },
          { account: "sadqa", delta: sadqa },
          { account: savingsAccount as AccountId, delta: saved },
        ]}
      />
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Saving..." : "Mark as received"}
      </button>
    </form>
  );
}
