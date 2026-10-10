import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSpending } from "@/lib/services/spending.service";
import { getBalances } from "@/lib/services/balance.service";
import { isUuid } from "@/lib/spending-input";
import { SpendingForm } from "@/components/spending-form";
import { FormCard } from "@/components/page-header";

export default async function EditSpendingPage({
  params,
}: PageProps<"/spendings/[id]/edit">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const [spending, balances] = await Promise.all([
    getSpending(user.id, id),
    getBalances(user.id),
  ]);
  if (!spending) notFound();

  return (
    <FormCard back={{ href: `/spendings/${spending.id}`, label: "Back to the spending" }} title="Edit spending">
      <SpendingForm
        mode="edit"
        spendingId={spending.id}
        balances={balances}
        defaultValues={{
          title: spending.title,
          amount: spending.amount,
          category: spending.category,
          spentOn: spending.spentOn,
          note: spending.note ?? "",
          account: spending.account,
        }}
      />
    </FormCard>
  );
}
