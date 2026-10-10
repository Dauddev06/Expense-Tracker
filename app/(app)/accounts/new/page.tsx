import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SavingsAccountForm } from "@/components/savings-account-form";
import { FormCard } from "@/components/page-header";

export const metadata = { title: "Add a savings account" };

// /accounts/new wins over /accounts/[account]: a folder with a fixed name
// is always matched before a [dynamic] one.
export default async function NewSavingsAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <FormCard
      back={{ href: "/accounts", label: "Back to accounts" }}
      title="Add a savings account"
      intro="Keep money for different goals apart, e.g. an emergency fund and Hajj. Each one has its own balance."
    >
      <SavingsAccountForm mode="create" />
    </FormCard>
  );
}
