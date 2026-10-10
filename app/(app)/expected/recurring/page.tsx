import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listRecurring } from "@/lib/services/expected.service";
import { formatMoney } from "@/lib/constants";
import { chapterLabel } from "@/lib/dates";
import { frequencyLabel } from "@/lib/expected-input";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/confirm-action";
import { OptimisticItem } from "@/components/optimistic-item";
import { PauseRecurringButton } from "@/components/pause-recurring-button";
import { IconTile } from "@/components/icons";
import { BackLink, PageHeader } from "@/components/page-header";


export const metadata = { title: "Repeating expenses" };
export default async function RecurringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recurring = await listRecurring(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink href="/expected" label="Back to expected expenses" />
        <PageHeader
          title="Repeating expenses"
          description="These are added to every month automatically. Pause one to stop it for now."
        />
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          icon="repeat"
          message="No repeating expenses yet. When you add an expected expense, choose “Every week” or “Every month” to repeat it."
          actionHref="/expected/new"
          actionLabel="Add expected expense"
        />
      ) : (
        <ul className="space-y-3">
          {recurring.map((r) => (
            <OptimisticItem key={r.id} className="card">
              <div className="flex items-start gap-3">
                <IconTile name="repeat" tone="bg-brand-soft text-brand-ink" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="row-title">{r.title}</h2>
                    <p className="font-semibold whitespace-nowrap text-ink tabular-nums">
                      {formatMoney(r.amount)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`badge ${r.active ? "bg-positive-soft text-positive" : "bg-warning-soft text-warning"}`}
                    >
                      {r.active ? "On" : "Paused"}
                    </span>
                    <span className="row-meta">
                      {frequencyLabel(r.frequency)} · since {chapterLabel(r.startChapter)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/expected/recurring/${r.id}/edit`} className="btn-secondary">
                      Edit
                    </Link>
                    <PauseRecurringButton recurring={r} />
                    <ConfirmAction
                      variant="danger"
                      label="Delete"
                      title={`Stop repeating ${r.title}?`}
                      message="Upcoming unpaid ones are removed. Ones you already paid stay as they are, and your balances don't change."
                      confirmLabel="Yes, delete it"
                      url={`/api/recurring/${r.id}`}
                      successMessage={`${r.title} deleted`}
                      removesItem
                    />
                  </div>
                </div>
              </div>
            </OptimisticItem>
          ))}
        </ul>
      )}
    </div>
  );
}
