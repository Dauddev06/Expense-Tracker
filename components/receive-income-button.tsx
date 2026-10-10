"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { formatMoney } from "@/lib/constants";
import type { Balances } from "@/lib/accounts";
import { applyServerErrors, sendJson } from "@/lib/client-fetch";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { DateField } from "@/components/form/date-field";
import { EffectPreview } from "@/components/form/effect-preview";
import { FormError } from "@/components/form/form-error";
import { useToday } from "@/components/form/use-today";

type Props = {
  income: { id: string; title: string; amount: number };
  sadqaPercent: number;
  balances: Balances;
};

// "Mark as received" -> a small pop-up asking WHEN it arrived.
export function ReceiveIncomeButton({ income, sadqaPercent, balances }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Mark as received
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${income.title} received`}>
        <ReceiveForm income={income} sadqaPercent={sadqaPercent} balances={balances} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function ReceiveForm({ income, sadqaPercent, balances, onDone }: Props & { onDone: () => void }) {
  const router = useRouter();
  const showToast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { today, yesterday } = useToday();
  const sadqa = Math.round(income.amount * sadqaPercent) / 100;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<{ receivedOn: string }>({ defaultValues: { receivedOn: today } });
  const receivedOn = useWatch({ control, name: "receivedOn" });

  async function onSubmit(values: { receivedOn: string }) {
    setServerError(null);
    const { ok, data } = await sendJson(`/api/income/${income.id}/receive`, "POST", values);
    if (!ok) {
      setServerError(applyServerErrors(data, setError, Object.keys(getValues())));
      return;
    }
    showToast(`Received ${formatMoney(income.amount)} into Current`);
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <p className="text-ink-2">
        {formatMoney(income.amount)} goes into Current.
        {sadqa > 0 && ` ${formatMoney(sadqa)} (${sadqaPercent}%) of it is set aside for Sadqa.`}
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
      <EffectPreview
        balances={balances}
        changes={[
          { account: "current", delta: income.amount - sadqa },
          { account: "sadqa", delta: sadqa },
        ]}
      />
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Saving..." : "Mark as received"}
      </button>
    </form>
  );
}
