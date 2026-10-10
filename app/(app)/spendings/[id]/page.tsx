import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSpending } from "@/lib/services/spending.service";
import { getAllAccountNames } from "@/lib/services/savings-account.service";
import { isUuid } from "@/lib/spending-input";
import { formatMoney } from "@/lib/constants";
import { getAccount } from "@/lib/accounts";
import { friendlyDate, todayString } from "@/lib/dates";
import { ConfirmAction } from "@/components/confirm-action";
import { IconTile } from "@/components/icons";
import { BackLink } from "@/components/page-header";

// URL /spendings/abc-123  ->  params = Promise<{ id: "abc-123" }>
export default async function SpendingDetailPage({
  params,
}: PageProps<"/spendings/[id]">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const [spending, accounts] = await Promise.all([getSpending(user.id, id), getAllAccountNames(user.id)]);
  if (!spending) notFound(); // shows app/(app)/spendings/[id]/not-found.tsx

  const account = getAccount(spending.account, accounts);

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <BackLink href="/spendings" label="Back to spendings" />

      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <IconTile name="receipt" tone="bg-negative-soft text-negative" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="row-meta">Spending</p>
            <h1 className="page-title">{spending.title}</h1>
          </div>
        </div>

        <p className="text-4xl font-semibold tracking-tight money-out">−{formatMoney(spending.amount)}</p>

        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">When</dt>
            <dd className="font-medium text-ink">{friendlyDate(spending.spentOn, todayString())}</dd>
          </div>
          <div>
            <dt className="text-muted">Paid from</dt>
            <dd className="font-medium text-ink">{account.label}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted">Note</dt>
            <dd className="font-medium text-ink">{spending.note ?? "None"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Link href={`/spendings/${spending.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <ConfirmAction
            variant="danger"
            label="Delete"
            title="Delete this spending?"
            message={`This will put ${formatMoney(spending.amount)} back into ${account.label}.`}
            confirmLabel="Yes, delete it"
            url={`/api/spendings/${spending.id}`}
            successMessage="Spending deleted"
            redirectTo="/spendings"
          />
        </div>
      </div>
    </div>
  );
}
