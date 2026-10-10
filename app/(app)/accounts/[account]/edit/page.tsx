import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getStartingAmount, getUserAccounts } from "@/lib/services/savings-account.service";
import { isExtraSavings, isSavingsAccount } from "@/lib/accounts";
import { SavingsAccountForm } from "@/components/savings-account-form";
import { ConfirmAction } from "@/components/confirm-action";
import { FormCard } from "@/components/page-header";

export const metadata = { title: "Edit savings account" };

// Edit a savings account: the built-in Savings (name only) or one you added
// (name, starting amount, or close it).
export default async function EditSavingsAccountPage({ params }: PageProps<"/accounts/[account]/edit">) {
  const { account } = await params;
  if (!isSavingsAccount(account)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isExtra = isExtraSavings(account);
  const [accounts, startingAmount] = await Promise.all([
    getUserAccounts(user.id),
    isExtra ? getStartingAmount(user.id, account) : Promise.resolve(null),
  ]);
  const info = accounts.find((a) => a.value === account);
  if (!info) notFound();

  return (
    <FormCard back={{ href: `/accounts/${account}`, label: `Back to ${info.label}` }} title={`Edit ${info.label}`}>
      <SavingsAccountForm mode="edit" accountKey={account} name={info.label} startingAmount={startingAmount} />

      {!isExtra && (
        <p className="mt-6 text-sm text-muted">
          Its starting amount is changed together with your other accounts:{" "}
          <Link href="/accounts/opening" className="font-medium text-brand-ink underline">
            Change starting balances
          </Link>
          .
        </p>
      )}

      {isExtra && (
        <div className="mt-8 border-t border-line-soft pt-5">
          <h2 className="card-title">Close this account</h2>
          <p className="row-meta mt-1 mb-3">
            Only an empty account can be closed. Its past activity stays in your history.
          </p>
          <ConfirmAction
            variant="danger"
            label="Close account"
            title={`Close ${info.label}?`}
            message="It will disappear from your accounts. Nothing else changes."
            confirmLabel="Yes, close it"
            url={`/api/savings-accounts/${account}`}
            successMessage={`${info.label} closed`}
            redirectTo="/accounts"
            refreshLayout
          />
        </div>
      )}
    </FormCard>
  );
}
