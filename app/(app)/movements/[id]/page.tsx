import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMoneyAction } from "@/lib/services/ledger.service";
import { removeEffect } from "@/lib/services/activity.service";
import { getAllAccountNames } from "@/lib/services/savings-account.service";
import { isUuid } from "@/lib/spending-input";
import { formatMoney } from "@/lib/constants";
import { getAccount } from "@/lib/accounts";
import type { MoneyAction } from "@/lib/money-input";
import { friendlyDate, todayString } from "@/lib/dates";
import { ConfirmAction } from "@/components/confirm-action";
import { IconTile, type IconName } from "@/components/icons";
import { BackLink } from "@/components/page-header";

// What each hand-made movement is called, and how it looks
const KINDS: Record<MoneyAction, { title: string; icon: IconName; tone: string; flow: "in" | "out" | "move" }> = {
  deposit: { title: "Added money", icon: "arrow-in", tone: "bg-positive-soft text-positive", flow: "in" },
  transfer: { title: "Moved money", icon: "move", tone: "bg-tile text-muted", flow: "move" },
  savings_borrow: { title: "Borrowed from savings", icon: "move", tone: "bg-warning-soft text-warning", flow: "move" },
  savings_repay: { title: "Paid savings back", icon: "move", tone: "bg-positive-soft text-positive", flow: "move" },
  sadqa_given: { title: "Gave Sadqa", icon: "heart", tone: "bg-sadqa-soft text-sadqa", flow: "out" },
};

// URL /movements/abc-123: one Add money / Move money / ... entry
export default async function MovementDetailPage({ params }: PageProps<"/movements/[id]">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const [entry, accounts] = await Promise.all([getMoneyAction(user.id, id), getAllAccountNames(user.id)]);
  if (!entry) notFound();

  const kind = KINDS[entry.type as MoneyAction];
  const from = entry.fromAccount ? getAccount(entry.fromAccount, accounts) : null;
  const to = entry.toAccount ? getAccount(entry.toAccount, accounts) : null;
  // Back to the account it touched (where the money went, or came from)
  const home = to ?? from!;
  const sign = kind.flow === "in" ? "+" : kind.flow === "out" ? "−" : "";
  const colour = kind.flow === "in" ? "money-in" : kind.flow === "out" ? "money-out" : "text-ink";

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <BackLink href={`/accounts/${home.value}`} label={`Back to ${home.label}`} />

      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <IconTile name={kind.icon} tone={kind.tone} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="row-meta">Money movement</p>
            <h1 className="page-title">{kind.title}</h1>
          </div>
        </div>

        <p className={`text-4xl font-semibold tracking-tight ${colour}`}>
          {sign}
          {formatMoney(entry.amount)}
        </p>

        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-surface-2 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">When</dt>
            <dd className="font-medium text-ink">{friendlyDate(entry.occurredOn, todayString())}</dd>
          </div>
          {from && (
            <div>
              <dt className="text-muted">From</dt>
              <dd className="font-medium text-ink">{from.label}</dd>
            </div>
          )}
          {to && (
            <div>
              <dt className="text-muted">Into</dt>
              <dd className="font-medium text-ink">{to.label}</dd>
            </div>
          )}
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted">Note</dt>
            <dd className="font-medium text-ink">{entry.note ?? "None"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <ConfirmAction
            variant="danger"
            label="Remove"
            title="Remove this?"
            message={removeEffect(entry, accounts)}
            confirmLabel="Yes, remove it"
            url={`/api/money/${entry.id}`}
            successMessage="Removed"
            redirectTo={`/accounts/${home.value}`}
          />
        </div>
      </div>
    </div>
  );
}
