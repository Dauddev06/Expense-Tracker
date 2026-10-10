import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getIncome } from "@/lib/services/income.service";
import { getSettings } from "@/lib/services/settings.service";
import { getBalances } from "@/lib/services/balance.service";
import { isUuid } from "@/lib/spending-input";
import { IncomeForm } from "@/components/income-form";
import { FormCard } from "@/components/page-header";

export default async function EditIncomePage({ params }: PageProps<"/income/[id]/edit">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const [income, settings, balances] = await Promise.all([
    getIncome(user.id, id),
    getSettings(user.id),
    getBalances(user.id),
  ]);
  if (!income) notFound();

  return (
    <FormCard back={{ href: `/income?chapter=${income.chapter}`, label: "Back to income" }} title={`Edit ${income.title}`}>
        <IncomeForm
          chapter={income.chapter}
          incomeId={income.id}
          balances={balances}
          // A received income keeps the Sadqa % it was received with
          sadqaPercent={income.sadqaPercentApplied ?? settings.sadqaPercent}
          // …and the savings it was received with (Settings if not received yet)
          savings={
            income.status === "received"
              ? { percent: income.savingsPercentApplied ?? 0, account: income.savingsAccountApplied ?? "savings" }
              : { percent: settings.savingsPercent, account: settings.savingsAccount }
          }
          initial={{
            title: income.title,
            amount: income.amount,
            received: income.status === "received",
            receivedOn: income.receivedOn,
          }}
          submitLabel="Save changes"
        />
    </FormCard>
  );
}
