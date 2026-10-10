import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLoan } from "@/lib/services/loan.service";
import { getBalances } from "@/lib/services/balance.service";
import { getAllAccountNames } from "@/lib/services/savings-account.service";
import { isUuid } from "@/lib/spending-input";
import { accountLabel } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { friendlyDate, todayString } from "@/lib/dates";
import { ConfirmAction } from "@/components/confirm-action";
import { OptimisticItem } from "@/components/optimistic-item";
import { LoanPaymentForm } from "@/components/loan-payment-form";
import { IconTile } from "@/components/icons";
import { BackLink } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";

export default async function LoanDetailPage({ params }: PageProps<"/loans/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const [loan, balances, accounts] = await Promise.all([
    getLoan(user.id, id),
    getBalances(user.id),
    getAllAccountNames(user.id),
  ]);
  if (!loan) notFound();

  const today = todayString();
  const lent = loan.direction === "given";
  const settled = loan.status === "settled";
  const progress = Math.min(100, Math.round((loan.paid / loan.amount) * 100));
  const headline = settled
    ? `${loan.personName} and you are even`
    : lent
      ? `${loan.personName} owes you ${formatMoney(loan.outstanding)}`
      : `You owe ${loan.personName} ${formatMoney(loan.outstanding)}`;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <BackLink href="/loans" label="Back to loans" />

      <section className="card space-y-5">
        <div className="flex items-start gap-3">
          <PersonAvatar
            name={loan.personName}
            tone={lent ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}
          />
          <div className="min-w-0">
            <p className="row-meta">
              {lent ? "You lent" : "You borrowed"} {formatMoney(loan.amount)}{" "}
              {loan.alreadyExisted
                ? "before you started using the app"
                : lent
                  ? `from ${accountLabel(loan.account, accounts)}`
                  : `into ${accountLabel(loan.account, accounts)}`}{" "}
              ·{" "}
              {friendlyDate(loan.startedOn, today)}
            </p>
            <h1 className="page-title">{headline}</h1>
            {loan.note && <p className="mt-1 text-ink-2">Note: {loan.note}</p>}
          </div>
        </div>
        <div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-tile"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Paid back"
          >
            <div className="h-full rounded-full bg-positive-solid" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {formatMoney(loan.paid)} of {formatMoney(loan.amount)} paid back ({progress}%)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/loans/${loan.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <ConfirmAction
            variant="danger"
            label="Delete loan"
            title="Delete this loan?"
            message={`This removes the loan${
              loan.payments.length ? ` and its ${loan.payments.length} payment(s)` : ""
            }${
              loan.alreadyExisted
                ? // An old loan never moved money: only its payments did
                  loan.payments.length
                  ? ", and reverses what the payments did to your balances."
                  : ". Your balances don't change."
                : `, and undoes what they did to your balances: ${
                    lent
                      ? `${formatMoney(loan.amount)} goes back into ${accountLabel(loan.account, accounts)}`
                      : `${formatMoney(loan.amount)} is taken back out of ${accountLabel(loan.account, accounts)}`
                  }${loan.payments.length ? ", and the payments are reversed" : ""}.`
            }`}
            confirmLabel="Yes, delete it"
            url={`/api/loans/${loan.id}`}
            successMessage="Loan deleted"
            redirectTo="/loans"
          />
        </div>
      </section>

      {!settled && (
        <section className="card" aria-labelledby="pay-title">
          <h2 id="pay-title" className="card-title mb-4">
            {lent ? `${loan.personName} paid you back?` : `Paying ${loan.personName} back?`}
          </h2>
          <LoanPaymentForm loan={loan} balances={balances} />
        </section>
      )}

      <section className="card" aria-labelledby="history-title">
        <div className="card-header">
          <h2 id="history-title" className="card-title">
            Payments
          </h2>
          <span className="row-meta">{loan.payments.length}</span>
        </div>
        {loan.payments.length === 0 ? (
          <p className="text-muted">No payments yet.</p>
        ) : (
          <ul className="-my-3 divide-y divide-line-soft">
            {loan.payments.map((p) => (
              <OptimisticItem key={p.id} className="list-row flex-wrap">
                <IconTile
                  name={lent ? "arrow-in" : "arrow-out"}
                  tone={lent ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}
                />
                <div className="min-w-0 flex-1">
                  <p className="row-title">
                    {lent
                      ? `${loan.personName} paid back ${formatMoney(p.amount)} into ${accountLabel(p.account, accounts)}`
                      : `Paid back ${formatMoney(p.amount)} to ${loan.personName} from ${accountLabel(p.account, accounts)}`}
                  </p>
                  <p className="row-meta">
                    {friendlyDate(p.paidOn, today)}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <ConfirmAction
                  label="Delete"
                  title="Delete this payment?"
                  message={
                    lent
                      ? `This will take ${formatMoney(p.amount)} back out of ${accountLabel(p.account, accounts)}, and ${loan.personName} will owe it again.`
                      : `This will put ${formatMoney(p.amount)} back into ${accountLabel(p.account, accounts)}, and you will owe it again.`
                  }
                  confirmLabel="Yes, delete it"
                  url={`/api/loans/${loan.id}/payments/${p.id}`}
                  successMessage="Payment deleted"
                  removesItem
                />
              </OptimisticItem>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
