import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboard } from "@/lib/services/dashboard.service";
import { hasOpeningBalances } from "@/lib/services/ledger.service";
import { formatMoney, getCategory } from "@/lib/constants";
import { chapterLabel, readChapterParam, todayString } from "@/lib/dates";
import { BalanceCards } from "@/components/balance-cards";
import { ChapterNav } from "@/components/chapter-nav";
import { ActivityList } from "@/components/activity-list";
import { PendingList } from "@/components/planned-list";
import { Icon, IconTile, type IconName } from "@/components/icons";

export const metadata = { title: "Dashboard" };

// A row inside "Who owes what": icon, label, amount
function OweRow({
  href,
  icon,
  tone,
  label,
  amount,
}: {
  href: string;
  icon: IconName;
  tone: string;
  label: string;
  amount: number;
}) {
  return (
    <li>
      <Link href={href} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
        <IconTile name={icon} tone={tone} />
        <span className="row-title flex-1">{label}</span>
        <span className="amount text-ink">{formatMoney(amount)}</span>
        <Icon name="chevron-right" className="size-5 text-faint" />
      </Link>
    </li>
  );
}

// The Dashboard answers three questions, biggest first:
// How much do I have? What's left to pay this month? Who owes what?
export default async function DashboardPage({ searchParams }: PageProps<"/home">) {
  const { chapter: chapterParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Brand-new users first tell us how much money they have
  if (!(await hasOpeningBalances(user.id))) redirect("/welcome");

  const chapter = readChapterParam(chapterParam);
  const month = chapterLabel(chapter);
  const d = await getDashboard(user.id, chapter);
  const today = todayString();
  const biggestCategory = d.spending.byCategory[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Hi, {user.name}</h1>
        <ChapterNav chapter={chapter} basePath="/home" />
      </div>

      {/* 1. How much do I have? */}
      <section aria-labelledby="have-title" className="space-y-3">
        <div className="hero">
          <h2 id="have-title" className="text-sm font-semibold text-on-brand/85">
            You have right now
          </h2>
          <p className="amount mt-2 text-[40px] leading-none sm:text-5xl">{formatMoney(d.balances.total)}</p>
          <p className="mt-2 text-sm text-on-brand/80">in all your accounts together</p>
        </div>
        <BalanceCards balances={d.balances} />
      </section>

      {/* 2. What's left to pay this month? */}
      <section aria-labelledby="topay-title" className="card">
        <div className="card-header items-start">
          <div>
            <h2 id="topay-title" className="card-title">
              Still to pay in {month}
            </h2>
            <p className="amount mt-1 text-2xl text-ink">{formatMoney(d.expected.stillToPay)}</p>
            {d.expected.total > 0 && (
              <p className="row-meta">
                {formatMoney(d.expected.paid)} paid of {formatMoney(d.expected.total)}
              </p>
            )}
          </div>
          <Link href={`/expected?chapter=${chapter}`} className="btn-link -mr-3">
            See all
          </Link>
        </div>
        {d.pending.length === 0 ? (
          d.expected.total > 0 ? (
            <p className="flex items-center gap-2 text-positive">
              <Icon name="check-circle" />
              Everything for {month} is paid.
            </p>
          ) : (
            <p className="text-ink-2">
              Nothing planned yet.{" "}
              <Link href={`/expected/new?chapter=${chapter}`} className="font-semibold text-brand-ink underline">
                Add an expected expense
              </Link>{" "}
              like rent or bills.
            </p>
          )
        ) : (
          <PendingList items={d.pending.slice(0, 3)} balances={d.balances} today={today} compact />
        )}
      </section>

      {/* 3. Who owes what? */}
      <section aria-labelledby="owe-title" className="card">
        <h2 id="owe-title" className="card-title mb-2">
          Who owes what
        </h2>
        <ul className="divide-y divide-line-soft">
          <OweRow href="/loans" icon="arrow-in" tone="bg-positive-soft text-positive" label="People owe me" amount={d.loans.owedToMe} />
          <OweRow href="/loans" icon="arrow-out" tone="bg-negative-soft text-negative" label="I owe people" amount={d.loans.iOwe} />
          <OweRow href="/accounts/savings" icon="piggy" tone="bg-warning-soft text-warning" label="I owe Savings" amount={d.owedToSavings} />
        </ul>
      </section>

      {/* 4. The month in three numbers + where the money went */}
      <section aria-labelledby="month-title" className="card">
        <h2 id="month-title" className="card-title mb-4">
          {month}
        </h2>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 sm:p-4">
          <div>
            <p className="stat-label">Income</p>
            <p className="amount mt-1 text-[15px] text-positive sm:text-lg">{formatMoney(d.income.received)}</p>
          </div>
          <div>
            <p className="stat-label">Spent</p>
            <p className="amount mt-1 text-[15px] text-negative sm:text-lg">{formatMoney(d.spending.total)}</p>
          </div>
          <div>
            <p className="stat-label">{d.left >= 0 ? "Left" : "Overspent"}</p>
            <p className={`amount mt-1 text-[15px] sm:text-lg ${d.left >= 0 ? "text-ink" : "text-negative"}`}>
              {formatMoney(Math.abs(d.left))}
            </p>
          </div>
        </div>
        {d.income.expected > d.income.received && (
          <p className="row-meta mt-2">
            {formatMoney(d.income.expected - d.income.received)} of income not received yet.
          </p>
        )}

        {d.spending.byCategory.length > 0 && (
          <ul className="mt-5 space-y-3">
            {d.spending.byCategory.map((c) => {
              const cat = getCategory(c.category);
              return (
                <li key={c.category} className="flex items-center gap-3">
                  <IconTile name={cat.icon} tone={cat.tile} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink">{cat.label}</span>
                      <span className="font-semibold text-ink tabular-nums">{formatMoney(c.total)}</span>
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

      {/* 5. Recent activity */}
      <section aria-labelledby="recent-title" className="card">
        <div className="card-header">
          <h2 id="recent-title" className="card-title">
            Recent activity
          </h2>
          <Link href="/accounts" className="btn-link -mr-3">
            See all
          </Link>
        </div>
        {d.recent.length === 0 ? (
          <p className="text-muted">Nothing yet. Add a spending with the + button.</p>
        ) : (
          <ActivityList items={d.recent.slice(0, 5)} today={today} />
        )}
      </section>
    </div>
  );
}
