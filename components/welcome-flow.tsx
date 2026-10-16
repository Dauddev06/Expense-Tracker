"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNTS, EMPTY_BALANCES, type Balances } from "@/lib/accounts";
import { IconTile } from "@/components/icons";
import { OpeningBalancesForm } from "@/components/opening-balances-form";
import { SettingsForm } from "@/components/settings-form";
import { IncomeForm } from "@/components/income-form";

type Props = { name: string; chapter: string; sadqaPercent: number };

const HELP: Record<string, string> = {
  current: "your main bank account",
  savings: "money you are putting away",
  pocket: "cash in your wallet",
};
const ACCOUNT_HELP = ACCOUNTS.filter((a) => a.value in HELP).map((a) => ({ ...a, help: HELP[a.value] }));

// First-time setup in 3 short steps, then on to the Dashboard.
export function WelcomeFlow({ name, chapter, sadqaPercent: initialPercent }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [balances, setBalances] = useState<Balances>(EMPTY_BALANCES);
  const [sadqaPercent, setSadqaPercent] = useState(initialPercent);

  function finish() {
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-ink">Step {step} of 3</p>
        <div className="mt-2 flex gap-2" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-2 flex-1 rounded-full ${n <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div className="card">
        {step === 1 && (
          <>
            <h1 className="page-title">Welcome, {name}!</h1>
            <p className="mt-2 mb-6 text-ink-2">
              Let&apos;s start with how much money you have <strong>right now</strong>. A rough
              number is fine, you can change it later.
            </p>
            <OpeningBalancesForm
              initial={EMPTY_BALANCES}
              includeSadqa={false}
              submitLabel="Next"
              onSaved={(values) => {
                setBalances(values);
                setStep(2);
              }}
            />
            <ul className="mt-6 space-y-3 border-t border-line-soft pt-5">
              {ACCOUNT_HELP.map((item) => (
                <li key={item.value} className="flex items-center gap-3 text-sm text-ink-2">
                  <IconTile name={item.icon} tone={item.tone} size="sm" />
                  <span>
                    <strong className="text-ink">{item.label}</strong>: {item.help}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="page-title">Sadqa</h1>
            <p className="mt-2 mb-6 text-ink-2">
              Would you like to give part of every income as Sadqa? We&apos;ll remind you how much
              you still have to give.
            </p>
            <SettingsForm
              sadqaPercent={sadqaPercent}
              submitLabel="Next"
              onSaved={(percent) => {
                setSadqaPercent(percent);
                setStep(3);
              }}
            />
            <button type="button" className="btn-link mt-3 -ml-3" onClick={() => setStep(3)}>
              Skip for now
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="page-title">This month&apos;s income</h1>
            <p className="mt-2 mb-6 text-ink-2">
              What do you expect to earn this month, like your salary? You can add more later.
            </p>
            <IncomeForm
              chapter={chapter}
              balances={balances}
              sadqaPercent={sadqaPercent}
              submitLabel="Finish"
              onSaved={finish}
            />
            <button type="button" className="btn-link mt-3 -ml-3" onClick={finish}>
              Skip, go to my dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
