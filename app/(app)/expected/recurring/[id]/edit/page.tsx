import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getRecurring } from "@/lib/services/expected.service";
import { isUuid } from "@/lib/spending-input";
import { RecurringForm } from "@/components/recurring-form";
import { FormCard } from "@/components/page-header";

export default async function EditRecurringPage({
  params,
}: PageProps<"/expected/recurring/[id]/edit">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const recurring = await getRecurring(user.id, id);
  if (!recurring) notFound();

  return (
    <FormCard back={{ href: "/expected/recurring", label: "Back to repeating expenses" }} title={`Edit ${recurring.title}`}>
        <RecurringForm
          id={recurring.id}
          initial={{
            title: recurring.title,
            amount: recurring.amount,
            category: recurring.category,
            frequency: recurring.frequency,
            active: recurring.active ? "on" : "paused",
          }}
        />
    </FormCard>
  );
}
