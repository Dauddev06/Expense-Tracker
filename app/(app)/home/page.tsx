import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboard } from "@/lib/services/dashboard.service";
import { chapterOf } from "@/lib/services/account.service";
import { hasOpeningBalances } from "@/lib/services/ledger.service";
import { formatMoney } from "@/lib/constants";
import { accountLabel } from "@/lib/accounts";
import { chapterLabel, currentChapter, friendlyDate, readChapterParam, todayString } from "@/lib/dates";
import { BalanceCards } from "@/components/balance-cards";
import { ChapterNav } from "@/components/chapter-nav";
import { Icon } from "@/components/icons";

export const metadata = { title: "Dashboard" };

// The Dashboard is the month at a glance ("chapter"):
// how the month is going, and each account from the 1st until now.
// What's still to pay, loans and activity are on each account's own page.
export default async function DashboardPage({ searchParams }: PageProps<"/home">) {
  const { chapter: chapterParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);
  const month = chapterLabel(chapter);
  const isThisMonth = chapter === currentChapter();
  // Both at the same time: one round trip to the database instead of two
  const [hasStarted, d] = await Promise.all([hasOpeningBalances(user.id), getDashboard(user.id, chapter)]);
  // Brand-new users first tell us how much money they have
  if (!hasStarted) redirect("/welcome");

  const today = todayString();
  const monthName = month.split(" ")[0]; // "October"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="row-meta">Hi, {user.name}</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <ChapterNav chapter={chapter} basePath="/home" />
      </div>

      {/* 1. The month in numbers */}
      <section aria-labelledby="month-title" className="hero">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="month-title" className="text-sm text-hero-ink/70">
            {month}
          </h2>
          <span className="badge bg-white/10 text-hero-ink/80">{isThisMonth ? "In progress" : "Finished"}</span>
        </div>
        <p className="mt-3 text-sm text-hero-ink/70">{isThisMonth ? "Total money" : `Total money at the end of ${monthName}`}</p>
        <p className="amount text-4xl sm:text-5xl">{formatMoney(d.total)}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Income</p>
            <p className="amount mt-0.5 text-positive-solid">+{formatMoney(d.income.received)}</p>
          </div>
          {/* Money added by hand (gifts etc.), not income: tap to see the list below */}
          <a href="#added-title" className="hero-box transition hover:bg-white/5">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Money added</p>
            <p className="amount mt-0.5 text-positive-solid">
              +{formatMoney(d.added.total)}
              <span className="ml-1.5 text-xs text-hero-ink/60">({d.added.items.length})</span>
            </p>
          </a>
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Spent</p>
            <p className="amount mt-0.5 text-[#ff8a80]">−{formatMoney(d.spending.total)}</p>
          </div>
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Income still coming</p>
            <p className="amount mt-0.5">{formatMoney(Math.max(d.income.expected - d.income.received, 0))}</p>
          </div>
          <Link
            href={`/expected?chapter=${chapter}`}
            className="hero-box col-span-2 transition hover:bg-white/5 sm:col-span-1"
          >
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Still to pay</p>
            <p className="amount mt-0.5 text-[#fcd34d]">
              {formatMoney(d.toPay.stillToPay)}
              <span className="ml-1.5 text-xs text-hero-ink/60">({d.toPay.pendingCount})</span>
            </p>
          </Link>
        </div>
      </section>

      {/* 2. Each account: what it started the month with, and what it has now */}
      <section aria-labelledby="accounts-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="accounts-title" className="card-title">
            {isThisMonth ? "Your accounts" : `Your accounts at the end of ${month}`}
          </h2>
          <Link href="/accounts" className="btn-link -mr-3">
            Manage
          </Link>
        </div>
        <BalanceCards
          chapter={isThisMonth ? undefined : chapter}
          cards={d.accounts.map((info) => {
            const ledger = chapterOf(d.ledger, info.value);
            return { info, balance: ledger.closing, opening: { amount: ledger.opening, month: monthName } };
          })}
        />
      </section>

      {/* 3. The biggest spendings of the month */}
      <section aria-labelledby="spent-title" className="card">
        <div className="card-header">
          <div>
            <h2 id="spent-title" className="card-title">
              Biggest spendings in {monthName}
            </h2>
            <p className="row-meta">{formatMoney(d.spending.total)} spent in total</p>
          </div>
          <Link href={`/spendings?chapter=${chapter}`} className="btn-link -mr-3">
            See all
          </Link>
        </div>
        {d.spending.biggest.length === 0 ? (
          <p className="text-muted">Nothing spent in {month} yet. Add a spending with the + button.</p>
        ) : (
          <ul className="-my-3 divide-y divide-line-soft">
            {d.spending.biggest.map((s) => (
              <li key={s.id}>
                <Link href={`/spendings/${s.id}`} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="row-title block truncate">{s.title}</span>
                    <span className="row-meta block">
                      {friendlyDate(s.spentOn, today)} · from {accountLabel(s.account, d.accounts)}
                    </span>
                  </span>
                  <span className="amount money-out">−{formatMoney(s.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Money added by hand this month (not income) */}
      <section aria-labelledby="added-title" className="card scroll-mt-6">
        <div className="card-header">
          <div>
            <h2 id="added-title" className="card-title">
              Money added in {monthName}
            </h2>
            <p className="row-meta">{formatMoney(d.added.total)} added on top of income</p>
          </div>
          <Link href="/money/add" className="btn-link -mr-3">
            Add money
          </Link>
        </div>
        {d.added.items.length === 0 ? (
          <p className="text-muted">No money added in {month} other than income.</p>
        ) : (
          <ul className="-my-3 divide-y divide-line-soft">
            {d.added.items.map((e) => (
              <li key={e.id}>
                <Link href={`/movements/${e.id}`} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="row-title block truncate">{e.note ?? "Added money"}</span>
                    <span className="row-meta block">
                      {friendlyDate(e.occurredOn, today)} · into {accountLabel(e.toAccount!, d.accounts)}
                    </span>
                  </span>
                  <span className="amount money-in">+{formatMoney(e.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.toPay.pendingCount === 0 && d.toPay.total === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon name="calendar" className="size-4" />
          Nothing planned to pay in {month}.{" "}
          <Link href={`/expected/new?chapter=${chapter}`} className="font-medium text-brand-ink underline">
            Plan an expense
          </Link>
        </p>
      )}
    </div>
  );
}
