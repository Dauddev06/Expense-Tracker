import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOpeningBalances } from "@/lib/services/ledger.service";
import { OpeningBalancesForm } from "@/components/opening-balances-form";
import { FormCard } from "@/components/page-header";


export const metadata = { title: "Starting balances" };
export default async function OpeningBalancesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const opening = await getOpeningBalances(user.id);

  return (
    <FormCard
      back={{ href: "/accounts", label: "Back to accounts" }}
      title="Starting balances"
      intro="How much was in each account when you started using this app? Changing these updates every balance."
    >
      <OpeningBalancesForm initial={opening} includeSadqa submitLabel="Save starting balances" />
    </FormCard>
  );
}
