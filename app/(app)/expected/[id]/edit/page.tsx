import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getPlanned } from "@/lib/services/expected.service";
import { isUuid } from "@/lib/spending-input";
import { chapterLabel } from "@/lib/dates";
import { PlannedEditForm } from "@/components/planned-edit-form";
import { FormCard } from "@/components/page-header";

export default async function EditPlannedPage({ params }: PageProps<"/expected/[id]/edit">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const item = await getPlanned(user.id, id);
  if (!item) notFound();

  const intro = item.recurringExpenseId ? (
    <>
      This only changes the one in {chapterLabel(item.chapter)}. To change every month,{" "}
      <Link
        href={`/expected/recurring/${item.recurringExpenseId}/edit`}
        className="font-medium text-brand-ink underline"
      >
        edit the repeating expense
      </Link>
      .
    </>
  ) : (
    `For ${chapterLabel(item.chapter)}.`
  );

  return (
    <FormCard
      back={{ href: `/expected?chapter=${item.chapter}`, label: "Back to expected expenses" }}
      title={`Edit ${item.title}`}
      intro={intro}
    >
      {item.status === "done" ? (
        <p className="rounded-xl bg-surface-2 px-3 py-3 text-ink-2">
          This is already paid. Undo the payment first to change it.
        </p>
      ) : (
        <PlannedEditForm
          id={item.id}
          repeating={item.recurringExpenseId !== null}
          initial={{
            title: item.title,
            amount: item.amount,
            category: item.category,
            account: item.account,
            dueDate: item.dueDate,
          }}
        />
      )}
    </FormCard>
  );
}
