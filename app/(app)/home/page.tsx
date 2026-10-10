import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboard } from "@/lib/services/dashboard.service";
import { chapterOf } from "@/lib/services/account.service";
import { hasOpeningBalances } from "@/lib/services/ledger.service";
import { formatMoney, getCategory } from "@/lib/constants";
import { chapterLabel, currentChapter, readChapterParam } from "@/lib/dates";
import { BalanceCards } from "@/components/balance-cards";
import { ChapterNav } from "@/components/chapter-nav";
import { Icon, IconTile } from "@/components/icons";

export const metadata = { title: "Dashboard" };

// The Dashboard is the month at a glance ("chapter"):
// how the month is going, and each account from the 1st until now.
// Bills, loans and activity are on each account's own page.
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

  const biggestCategory = d.spending.byCategory[0]?.total ?? 0;
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
        <p className="mt-3 text-sm text-hero-ink/70">{d.left >= 0 ? "Left from income" : "Spent more than income"}</p>
        <p className="amount text-4xl sm:text-5xl">{formatMoney(Math.abs(d.left))}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Income</p>
            <p className="amount mt-0.5 text-positive-solid">+{formatMoney(d.income.received)}</p>
          </div>
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Spent</p>
            <p className="amount mt-0.5 text-[#ff8a80]">−{formatMoney(d.spending.total)}</p>
          </div>
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Income to come</p>
            <p className="amount mt-0.5">{formatMoney(Math.max(d.income.expected - d.income.received, 0))}</p>
          </div>
          <Link href={`/expected?chapter=${chapter}`} className="hero-box transition hover:bg-white/5">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Bills to pay</p>
            <p className="amount mt-0.5 text-[#fcd34d]">
              {d.bills.pendingCount} · {formatMoney(d.bills.stillToPay)}
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

      {/* 3. Where the money went */}
      <section aria-labelledby="spent-title" className="card">
        <div className="card-header">
          <h2 id="spent-title" className="card-title">
            Where the money went
          </h2>
          <Link href={`/spendings?chapter=${chapter}`} className="btn-link -mr-3">
            See all
          </Link>
        </div>
        {d.spending.byCategory.length === 0 ? (
          <p className="text-muted">Nothing spent in {month} yet. Add a spending with the + button.</p>
        ) : (
          <ul className="space-y-3">
            {d.spending.byCategory.map((c) => {
              const cat = getCategory(c.category);
              return (
                <li key={c.category} className="flex items-center gap-3">
                  <IconTile name={cat.icon} tone={cat.tile} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-ink">{cat.label}</span>
                      <span className="font-medium text-ink tabular-nums">{formatMoney(c.total)}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-tile" aria-hidden="true">
                      <div
                        className={`h-full rounded-full ${cat.bar}`}
                        style={{ width: `${Math.max(4, Math.round((c.total / biggestCategory) * 100))}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {d.bills.pendingCount === 0 && d.bills.total === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon name="calendar" className="size-4" />
          No bills planned for {month}.{" "}
          <Link href={`/expected/new?chapter=${chapter}`} className="font-medium text-brand-ink underline">
            Add one
          </Link>
        </p>
      )}
    </div>
  );
}
