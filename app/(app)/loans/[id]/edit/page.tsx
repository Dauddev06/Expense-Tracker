import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLoan } from "@/lib/services/loan.service";
import { getBalances } from "@/lib/services/balance.service";
import { isUuid } from "@/lib/spending-input";
import { LoanForm } from "@/components/loan-form";
import { FormCard } from "@/components/page-header";

export default async function EditLoanPage({ params }: PageProps<"/loans/[id]/edit">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const [loan, balances] = await Promise.all([getLoan(user.id, id), getBalances(user.id)]);
  if (!loan) notFound();

  return (
    <FormCard back={{ href: `/loans/${loan.id}`, label: "Back to the loan" }} title="Edit loan">
        <LoanForm
          balances={balances}
          loanId={loan.id}
          amountLocked={loan.payments.length > 0}
          initial={{
            direction: loan.direction,
            personName: loan.personName,
            amount: loan.amount,
            account: loan.account,
            startedOn: loan.startedOn,
            note: loan.note ?? "",
          }}
        />
    </FormCard>
  );
}
