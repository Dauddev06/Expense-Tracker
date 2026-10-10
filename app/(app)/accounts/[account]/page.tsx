import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalances, getOwedToSavings } from "@/lib/services/balance.service";
import { getAccountMonth } from "@/lib/services/account.service";
import { listActivity } from "@/lib/services/activity.service";
import { getSettings } from "@/lib/services/settings.service";
import { getAccount, isAccount, type AccountId } from "@/lib/accounts";
import { formatMoney, getCategory } from "@/lib/constants";
import { chapterEnd, chapterLabel, chapterStart, readChapterParam, todayString } from "@/lib/dates";
import { ChapterNav } from "@/components/chapter-nav";
import { ActivityList } from "@/components/activity-list";
import { Icon, IconTile, type IconName } from "@/components/icons";
import { BackLink } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";

// The buttons each account offers. The account is pre-picked in the form.
const ACTIONS: Record<AccountId, { href: string; label: string; icon: IconName }[]> = {
  current: [
    { href: "/spendings/new?account=current", label: "Add spending", icon: "receipt" },
    { href: "/money/add?to=current", label: "Add money", icon: "plus-circle" },
    { href: "/money/move?from=current", label: "Move money", icon: "move" },
  ],
  savings: [
    { href: "/money/borrow", label: "Borrow", icon: "arrow-out" },
    { href: "/money/repay", label: "Repay", icon: "arrow-in" },
    { href: "/money/add?to=savings", label: "Add money", icon: "plus-circle" },
    { href: "/money/move?to=savings", label: "Move in", icon: "move" },
  ],
  pocket: [
    { href: "/spendings/new?account=pocket", label: "Add spending", icon: "receipt" },
    { href: "/money/add?to=pocket", label: "Add money", icon: "plus-circle" },
    { href: "/money/move?from=pocket", label: "Move money", icon: "move" },
  ],
  sadqa: [{ href: "/money/sadqa", label: "Give Sadqa", icon: "heart" }],
};

export async function generateMetadata({ params }: PageProps<"/accounts/[account]">) {
  const { account } = await params;
  return { title: isAccount(account) ? getAccount(account).label : "Account" };
}

export default async function AccountPage({ params, searchParams }: PageProps<"/accounts/[account]">) {
  const { account } = await params;
  const { chapter: chapterParam } = await searchParams;
  if (!isAccount(account)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);
  const info = getAccount(account);
  const [balances, owedToSavings, month, activity, settings] = await Promise.all([
    getBalances(user.id),
    getOwedToSavings(user.id),
    getAccountMonth(user.id, account, chapter),
    listActivity(user.id, { account, limit: 100, from: chapterStart(chapter), to: chapterEnd(chapter) }),
    getSettings(user.id),
  ]);
  const today = todayString();
  const isSadqa = account === "sadqa";
  const biggest = month.byCategory[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      <BackLink href="/accounts" label="All accounts" />

      {/* The account and its balance */}
      <section className="card">
        <div className="flex items-start gap-4">
          <IconTile name={info.icon} tone={info.tone} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="page-title">{info.label}</h1>
            <p className="page-subtitle">{info.description}</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="stat-label">Balance right now</p>
          <p className="amount mt-1 text-4xl text-ink">{formatMoney(balances[account])}</p>
        </div>

        {/* Things that only matter for this account */}
        {account === "savings" && owedToSavings > 0 && (
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-warning ring-1 ring-warning-line">
            <Icon name="alert" />
            <span>
              You owe Savings <strong>{formatMoney(owedToSavings)}</strong>.
            </span>
          </p>
        )}
        {isSadqa && (
          <p className="mt-5 rounded-xl bg-surface-2 px-4 py-3 text-ink-2">
            {settings.sadqaPercent > 0
              ? `${settings.sadqaPercent}% of every income you receive is set aside here.`
              : "Nothing is set aside from income yet."}{" "}
            <Link href="/settings" className="font-semibold text-brand-ink underline">
              Change the %
            </Link>
          </p>
        )}

        {/* Two buttons per row on phones; the first one is full width when the count is odd */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {ACTIONS[account].map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className={`${index === 0 ? "btn-primary" : "btn-secondary"} px-3 whitespace-nowrap ${
                index === 0 && ACTIONS[account].length % 2 === 1 ? "col-span-2" : ""
              }`}
            >
              <Icon name={action.icon} className="size-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {/* The chosen month for this account */}
      <ChapterNav chapter={chapter} basePath={`/accounts/${account}`} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={isSadqa ? "Set aside" : "Money in"} value={formatMoney(month.moneyIn)} tone="in" />
        <StatCard label={isSadqa ? "Given" : "Money out"} value={formatMoney(month.moneyOut)} tone="out" />
      </div>

      {!isSadqa && month.byCategory.length > 0 && (
        <section className="card" aria-labelledby="spent-title">
          <div className="card-header">
            <h2 id="spent-title" className="card-title">
              Spent from {info.label}
            </h2>
            <p className="amount money-out">{formatMoney(month.spent)}</p>
          </div>
          <ul className="space-y-3">
            {month.byCategory.map((c) => {
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
                        style={{ width: `${Math.max(4, Math.round((c.total / biggest) * 100))}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="activity-title">
        <div className="card-header">
          <h2 id="activity-title" className="card-title">
            Activity in {chapterLabel(chapter)}
          </h2>
          <span className="row-meta">{activity.length}</span>
        </div>
        {activity.length === 0 ? (
          <p className="text-muted">
            Nothing went in or out of {info.label} in {chapterLabel(chapter)}.
          </p>
        ) : (
          <ActivityList items={activity} today={today} />
        )}
      </section>
    </div>
  );
}
