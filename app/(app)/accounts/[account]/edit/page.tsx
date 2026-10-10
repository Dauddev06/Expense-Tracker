import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUserAccounts } from "@/lib/services/savings-account.service";
import { isExtraSavings } from "@/lib/accounts";
import { SavingsAccountForm } from "@/components/savings-account-form";
import { ConfirmAction } from "@/components/confirm-action";
import { FormCard } from "@/components/page-header";

export const metadata = { title: "Edit savings account" };

// Rename or close one of the EXTRA savings accounts (the built-in ones can't be changed)
export default async function EditSavingsAccountPage({ params }: PageProps<"/accounts/[account]/edit">) {
  const { account } = await params;
  if (!isExtraSavings(account)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const info = (await getUserAccounts(user.id)).find((a) => a.value === account);
  if (!info) notFound();

  return (
    <FormCard back={{ href: `/accounts/${account}`, label: `Back to ${info.label}` }} title={`Edit ${info.label}`}>
      <SavingsAccountForm mode="rename" accountKey={account} name={info.label} />
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
    </FormCard>
  );
}
