import Link from "next/link";
import type { PlannedDTO } from "@/lib/services/expected.service";
import type { AccountInfo, Balances } from "@/lib/accounts";
import { accountLabel } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { friendlyDate, friendlyDateInline } from "@/lib/dates";
import { frequencyLabel } from "@/lib/expected-input";
import { Icon, IconTile } from "@/components/icons";
import { ConfirmAction } from "@/components/confirm-action";
import { OptimisticItem } from "@/components/optimistic-item";
import { MarkPaidButton } from "@/components/mark-paid-button";

// "Due today", "Due 15 Oct", or (late) "Was due 1 Oct"
function dueText(dueDate: string, today: string) {
  const nice = friendlyDateInline(dueDate, today); // "today", "15 Oct"
  return dueDate < today
    ? { text: `Was due ${nice}`, late: true }
    : { text: `Due ${nice}`, late: false };
}

// Expected expenses that are still to pay, each with "Mark as paid".
// `compact` (account pages) hides Edit / Delete to keep it simple.
// Pass `accounts` to show which account each one is paid from.
export function PendingList({
  items,
  balances,
  today,
  compact = false,
  accounts,
}: {
  items: PlannedDTO[];
  balances: Balances;
  today: string;
  compact?: boolean;
  accounts?: AccountInfo[];
}) {
  return (
    <ul className="-my-3 divide-y divide-line-soft">
      {items.map((item) => {
        const due = dueText(item.dueDate, today);
        return (
          <OptimisticItem key={item.id} className="py-3">
            <div className="flex items-start gap-3">
              <IconTile name="calendar" tone="bg-brand-soft text-brand-ink" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="row-title">{item.title}</p>
                  <p className="font-semibold whitespace-nowrap text-ink tabular-nums">
                    {formatMoney(item.amount)}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {due.late ? (
                    <span className="badge bg-warning-soft text-warning">
                      <Icon name="alert" className="size-3.5" />
                      {due.text}
                    </span>
                  ) : (
                    <span className="row-meta">{due.text}</span>
                  )}
                  {accounts && (
                    <span className="badge bg-tile text-ink-2">From {accountLabel(item.account, accounts)}</span>
                  )}
                  {item.frequency && (
                    <span className="badge bg-tile text-ink-2">
                      <Icon name="repeat" className="size-3.5" />
                      {frequencyLabel(item.frequency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:pl-13">
              <MarkPaidButton item={item} balances={balances} />
              {!compact && (
                <>
                  <Link
                    href={`/expected/${item.id}/edit`}
                    className="btn-secondary"
                  >
                    Edit
                  </Link>
                  <ConfirmAction
                    label="Delete"
                    title={`Delete ${item.title}?`}
                    message={
                      item.frequency
                        ? `Only this one (${friendlyDateInline(item.dueDate, today)}) is removed. The others keep repeating. Your balances don't change.`
                        : "It hasn't been paid, so your balances don't change."
                    }
                    confirmLabel="Yes, delete it"
                    url={`/api/expected/${item.id}`}
                    successMessage="Deleted"
                    removesItem
                  />
                </>
              )}
            </div>
          </OptimisticItem>
        );
      })}
    </ul>
  );
}

// Expected expenses already paid, each with "Undo".
export function PaidList({
  items,
  today,
  accounts,
}: {
  items: PlannedDTO[];
  today: string;
  accounts: AccountInfo[];
}) {
  return (
    <ul className="-my-3 divide-y divide-line-soft">
      {items.map((item) => (
        <OptimisticItem key={item.id} className="list-row">
          <IconTile name="check" tone="bg-positive-soft text-positive" />
          <div className="min-w-0 flex-1">
            <p className="row-title">{item.title}</p>
            {item.paid && (
              <p className="row-meta">
                Paid {formatMoney(item.paid.amount)} from{" "}
                {accountLabel(item.paid.account, accounts)} ·{" "}
                {friendlyDate(item.paid.paidOn, today)}
              </p>
            )}
          </div>
          <ConfirmAction
            label="Undo"
            title="Undo this payment?"
            message={
              item.paid
                ? `This will put ${formatMoney(item.paid.amount)} back into ${accountLabel(item.paid.account, accounts)} and show ${item.title} as still to pay.`
                : `${item.title} will show as still to pay.`
            }
            confirmLabel="Yes, undo it"
            url={`/api/expected/${item.id}/pay`}
            successMessage="Payment undone"
            removesItem
          />
        </OptimisticItem>
      ))}
    </ul>
  );
}
