import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalances } from "@/lib/services/balance.service";
import { LoanForm } from "@/components/loan-form";
import { FormCard } from "@/components/page-header";


export const metadata = { title: "Add a loan" };
export default async function NewLoanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const balances = await getBalances(user.id);

  return (
    <FormCard back={{ href: "/loans", label: "Back to loans" }} title="Add a loan">
      <LoanForm balances={balances} />
    </FormCard>
  );
}
