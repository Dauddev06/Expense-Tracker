import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSpending } from "@/lib/services/spending.service";
import { isUuid } from "@/lib/spending-input";
import { SpendingForm } from "@/components/spending-form";

export default async function EditSpendingPage({
  params,
}: PageProps<"/spendings/[id]/edit">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const spending = await getSpending(user.id, id);
  if (!spending) notFound();

  return (
    <div className="card">
      <h1 className="mb-6 text-2xl font-bold">Edit spending</h1>
      <SpendingForm
        mode="edit"
        spendingId={spending.id}
        defaultValues={{
          title: spending.title,
          amount: spending.amount,
          category: spending.category,
          spentOn: spending.spentOn,
          note: spending.note ?? "",
        }}
      />
    </div>
  );
}
