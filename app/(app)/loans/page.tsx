import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listLoans, summarizeLoans, type LoanDTO } from "@/lib/services/loan.service";
import { formatMoney } from "@/lib/constants";
import { friendlyDateInline, todayString } from "@/lib/dates";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { StatCard } from "@/components/stat-card";

function LoanRow({ loan, today }: { loan: LoanDTO; today: string }) {
  const settled = loan.status === "settled";
  const progress = Math.min(100, Math.round((loan.paid / loan.amount) * 100));
  return (
    <li>
      <Link href={`/loans/${loan.id}`} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
        <PersonAvatar
          name={loan.personName}
          tone={loan.direction === "given" ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}
        />
        <span className="min-w-0 flex-1">
          <span className="row-title block">{loan.personName}</span>
          <span className="row-meta block">
            {settled ? "Fully paid back" : `${formatMoney(loan.paid)} of ${formatMoney(loan.amount)} paid back`} ·
            since {friendlyDateInline(loan.startedOn, today)}
          </span>
          {!settled && (
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-tile" aria-hidden="true">
              <span className="block h-full rounded-full bg-positive-solid" style={{ width: `${progress}%` }} />
            </span>
          )}
        </span>
        <span className="text-right">
          <span className="block font-semibold whitespace-nowrap text-ink tabular-nums">
            {formatMoney(settled ? loan.amount : loan.outstanding)}
          </span>
          <span className="block text-xs text-muted">{settled ? "settled" : "left"}</span>
        </span>
      </Link>
    </li>
  );
}

function LoanSection({ title, empty, loans, today }: { title: string; empty: string; loans: LoanDTO[]; today: string }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        <span className="row-meta">{loans.length}</span>
      </div>
      {loans.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="-my-3 divide-y divide-line-soft">
          {loans.map((loan) => (
            <LoanRow key={loan.id} loan={loan} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}


export const metadata = { title: "Loans" };
export default async function LoansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const loans = await listLoans(user.id);
  const totals = summarizeLoans(loans);
  const today = todayString();
  const owedToMe = loans.filter((l) => l.direction === "given" && l.status === "open");
  const iOwe = loans.filter((l) => l.direction === "taken" && l.status === "open");
  const settled = loans.filter((l) => l.status === "settled");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans"
        description="Money you lent to people, or borrowed from them."
        action={
          <Link href="/loans/new" className="btn-primary">
            Add a loan
          </Link>
        }
      />

      {loans.length === 0 ? (
        <EmptyState
          icon="users"
          message="No loans yet. When you lend or borrow money, add it here."
          actionHref="/loans/new"
          actionLabel="Add a loan"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="People owe me" value={formatMoney(totals.owedToMe)} tone="in" />
            <StatCard label="I owe people" value={formatMoney(totals.iOwe)} tone="out" />
          </div>

          <LoanSection title="People owe me" empty="Nobody owes you money right now." loans={owedToMe} today={today} />
          <LoanSection title="I owe people" empty="You don't owe anyone right now." loans={iOwe} today={today} />

          {settled.length > 0 && (
            <details className="card group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between">
                <span className="card-title">Paid back ({settled.length})</span>
                <Icon name="chevron-down" className="size-5 text-muted transition group-open:rotate-180" />
              </summary>
              <ul className="mt-2 divide-y divide-line-soft">
                {settled.map((loan) => (
                  <LoanRow key={loan.id} loan={loan} today={today} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
