import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalances } from "@/lib/services/balance.service";
import { SpendingForm } from "@/components/spending-form";
import { FormCard } from "@/components/page-header";


export const metadata = { title: "Add spending" };
export default async function NewSpendingPage({ searchParams }: PageProps<"/spendings/new">) {
  const { account } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const balances = await getBalances(user.id);

  return (
    <FormCard back={{ href: "/spendings", label: "Back to spendings" }} title="Add a spending">
      <SpendingForm
        mode="create"
        balances={balances}
        presetAccount={typeof account === "string" ? account : undefined}
      />
    </FormCard>
  );
}
