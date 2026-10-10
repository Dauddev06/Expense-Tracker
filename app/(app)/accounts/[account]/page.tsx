import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalances, getOwedBySavings } from "@/lib/services/balance.service";
import { chapterOf, getAccountSpendingByCategory, getAccountsChapter } from "@/lib/services/account.service";
import { listActivity } from "@/lib/services/activity.service";
import { listPendingForAccount } from "@/lib/services/expected.service";
import { listLoans } from "@/lib/services/loan.service";
import { getUserAccounts } from "@/lib/services/savings-account.service";
import { getSettings } from "@/lib/services/settings.service";
import { isAccount, isExtraSavings, type AccountInfo } from "@/lib/accounts";
import { formatMoney, getCategory } from "@/lib/constants";
import {
  chapterEnd,
  chapterLabel,
  chapterStart,
  currentChapter,
  readChapterParam,
  todayString,
} from "@/lib/dates";
import { ChapterNav } from "@/components/chapter-nav";
import { ActivityList } from "@/components/activity-list";
import { PendingList } from "@/components/planned-list";
import { Icon, IconTile, type IconName } from "@/components/icons";
import { BackLink } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";

type Action = { href: string; label: string; icon: IconName };

// The buttons each account offers. The account is pre-picked in the form.
function actionsFor(info: AccountInfo): Action[] {
  const a = info.value;
  if (info.kind === "sadqa") return [{ href: "/money/sadqa", label: "Give Sadqa", icon: "heart" }];
  if (info.kind === "savings") {
    return [
      { href: `/money/add?to=${a}`, label: "Add money", icon: "plus-circle" },
      { href: `/money/move?to=${a}`, label: "Move in", icon: "move" },
      { href: `/money/borrow?from=${a}`, label: "Borrow", icon: "arrow-out" },
      { href: `/money/move?from=${a}`, label: "Move out", icon: "move" },
    ];
  }
  return [
    { href: `/spendings/new?account=${a}`, label: "Add spending", icon: "receipt" },
    { href: `/money/add?to=${a}`, label: "Add money", icon: "plus-circle" },
    { href: `/money/move?from=${a}`, label: "Move money", icon: "move" },
  ];
}

// One line in "Who owes what": who, how much, and a button to settle it
function OweRow({
  avatar,
  title,
  meta,
  amount,
  tone,
  action,
}: {
  avatar: React.ReactNode;
  title: string;
  meta: string;
  amount: number;
  tone: "in" | "out";
  action: { href: string; label: string };
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="row-title">{title}</p>
        <p className="row-meta">{meta}</p>
      </div>
      <p className={`amount ${tone === "in" ? "money-in" : "money-out"}`}>{formatMoney(amount)}</p>
      <Link href={action.href} className="btn-secondary w-full sm:w-auto">
        {action.label}
      </Link>
    </li>
  );
}

export async function generateMetadata({ params }: PageProps<"/accounts/[account]">) {
  const { account } = await params;
  const user = await getCurrentUser();
  const info = user ? (await getUserAccounts(user.id)).find((a) => a.value === account) : undefined;
  return { title: info?.label ?? "Account" };
}

export default async function AccountPage({ params, searchParams }: PageProps<"/accounts/[account]">) {
  const { account } = await params;
  const { chapter: chapterParam } = await searchParams;
  if (!isAccount(account)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accounts = await getUserAccounts(user.id);
  const info = accounts.find((a) => a.value === account);
  if (!info) notFound(); // e.g. someone else's savings account, or a closed one

  const chapter = readChapterParam(chapterParam);
  const isThisMonth = chapter === currentChapter();
  const canSpend = info.kind !== "sadqa";
  const [balances, owedBySavings, allLedgers, byCategory, activity, loans, bills, settings] = await Promise.all([
    getBalances(user.id),
    getOwedBySavings(user.id),
    getAccountsChapter(user.id, chapter),
    getAccountSpendingByCategory(user.id, account, chapter),
    listActivity(user.id, { account, limit: 100, from: chapterStart(chapter), to: chapterEnd(chapter) }),
    canSpend ? listLoans(user.id) : Promise.resolve([]),
    canSpend ? listPendingForAccount(user.id, account) : Promise.resolve([]),
    info.kind === "sadqa" ? getSettings(user.id) : Promise.resolve(null),
  ]);
  const today = todayString();
  const ledger = chapterOf(allLedgers, account);
  const month = chapterLabel(chapter);
  const biggest = byCategory[0]?.total ?? 0;
  const spent = byCategory.reduce((sum, c) => sum + c.total, 0);
  const isSadqa = info.kind === "sadqa";

  // ---- Who owes what, for THIS account ----
  // Loans that used this account (the money left from / came into it)
  const openLoans = loans.filter((l) => l.status === "open" && l.account === account);
  const theyOwe = openLoans.filter((l) => l.direction === "given");
  const iOwe = openLoans.filter((l) => l.direction === "taken");
  // Savings: on a savings page, what you owe IT. On Current / Pocket, every
  // savings account you owe, with a button to pay it back from here.
  const owedHere = info.kind === "savings" ? (owedBySavings[account] ?? 0) : 0;
  const savingsToRepay =
    account === "current" || account === "pocket"
      ? accounts.filter((a) => a.kind === "savings" && (owedBySavings[a.value] ?? 0) > 0)
      : [];
  const hasOwes = theyOwe.length + iOwe.length + savingsToRepay.length > 0 || owedHere > 0;

  const actions = actionsFor(info);

  return (
    <div className="space-y-6">
      <BackLink href="/accounts" label="All accounts" />

      <div className="flex flex-wrap items-start gap-4">
        <IconTile name={info.icon} tone={info.tone} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="page-title">{info.label}</h1>
          <p className="page-subtitle">{info.description}</p>
        </div>
        {isExtraSavings(account) && (
          <Link href={`/accounts/${account}/edit`} className="btn-secondary">
            <Icon name="pencil" className="size-4" />
            Edit
          </Link>
        )}
      </div>

      <ChapterNav chapter={chapter} basePath={`/accounts/${account}`} />

      {/* The month for this account, like a bank statement */}
      <section className="hero" aria-labelledby="balance-title">
        <p id="balance-title" className="text-sm text-hero-ink/70">
          {isThisMonth ? "Balance right now" : `Balance at the end of ${month}`}
        </p>
        <p className="amount mt-1 text-4xl sm:text-5xl">{formatMoney(ledger.closing)}</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">Started with</p>
            <p className="amount mt-0.5">{formatMoney(ledger.opening)}</p>
          </div>
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">{isSadqa ? "Set aside" : "Money in"}</p>
            <p className="amount mt-0.5 text-positive-solid">+{formatMoney(ledger.moneyIn)}</p>
          </div>
          <div className="hero-box">
            <p className="text-[11px] tracking-wider text-hero-ink/60 uppercase">{isSadqa ? "Given" : "Money out"}</p>
            <p className="amount mt-0.5 text-[#ff8a80]">−{formatMoney(ledger.moneyOut)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-hero-ink/60">
          Money left at the end of a month moves into the next month automatically.
        </p>
      </section>

      {isSadqa && settings && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-ink-2">
          {settings.sadqaPercent > 0
            ? `${settings.sadqaPercent}% of every income you receive is set aside here.`
            : "Nothing is set aside from income yet."}{" "}
          <Link href="/settings" className="font-medium text-brand-ink underline">
            Change the %
          </Link>
        </p>
      )}

      {/* Two buttons per row on phones; the first one is full width when the count is odd */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {actions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className={`${index === 0 ? "btn-primary" : "btn-secondary"} px-3 whitespace-nowrap ${
              index === 0 && actions.length % 2 === 1 ? "col-span-2" : ""
            }`}
          >
            <Icon name={action.icon} className="size-4" />
            {action.label}
          </Link>
        ))}
      </div>

      {/* Who owes what: only what touches THIS account */}
      {canSpend && (
        <section className="card" aria-labelledby="owe-title">
          <div className="card-header">
            <h2 id="owe-title" className="card-title">
              Who owes what
            </h2>
            <Link href={`/loans/new?account=${account}`} className="btn-link -mr-3">
              Add a loan
            </Link>
          </div>
          {!hasOwes ? (
            <p className="text-muted">Nobody owes anything for {info.label}.</p>
          ) : (
            <ul className="-my-3 divide-y divide-line-soft">
              {owedHere > 0 && (
                <OweRow
                  avatar={<IconTile name="piggy" tone="bg-warning-soft text-warning" />}
                  title={`You owe ${info.label}`}
                  meta="Borrowed from here, not paid back yet"
                  amount={owedHere}
                  tone="out"
                  action={{ href: `/money/repay?to=${account}`, label: "Pay back" }}
                />
              )}
              {savingsToRepay.map((s) => (
                <OweRow
                  key={s.value}
                  avatar={<IconTile name="piggy" tone="bg-warning-soft text-warning" />}
                  title={`You owe ${s.label}`}
                  meta={`Pay it back from ${info.label}`}
                  amount={owedBySavings[s.value] ?? 0}
                  tone="out"
                  action={{ href: `/money/repay?from=${account}&to=${s.value}`, label: `Pay back from ${info.label}` }}
                />
              ))}
              {iOwe.map((loan) => (
                <OweRow
                  key={loan.id}
                  avatar={<PersonAvatar name={loan.personName} tone="bg-negative-soft text-negative" />}
                  title={`You owe ${loan.personName}`}
                  meta={`Borrowed into ${info.label} · ${formatMoney(loan.paid)} of ${formatMoney(loan.amount)} paid`}
                  amount={loan.outstanding}
                  tone="out"
                  action={{ href: `/loans/${loan.id}`, label: "Pay back" }}
                />
              ))}
              {theyOwe.map((loan) => (
                <OweRow
                  key={loan.id}
                  avatar={<PersonAvatar name={loan.personName} tone="bg-positive-soft text-positive" />}
                  title={`${loan.personName} owes you`}
                  meta={`Lent from ${info.label} · ${formatMoney(loan.paid)} of ${formatMoney(loan.amount)} back`}
                  amount={loan.outstanding}
                  tone="in"
                  action={{ href: `/loans/${loan.id}`, label: "Got money back" }}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Bills to pay from this account (earlier months too: nothing is lost) */}
      {canSpend && (
        <section className="card" aria-labelledby="bills-title">
          <div className="card-header">
            <h2 id="bills-title" className="card-title">
              Still to pay from {info.label}
            </h2>
            {bills.length > 0 ? (
              <span className="amount text-ink">{formatMoney(bills.reduce((s, b) => s + b.amount, 0))}</span>
            ) : (
              <Link href={`/expected/new?account=${account}`} className="btn-link -mr-3">
                Add a bill
              </Link>
            )}
          </div>
          {bills.length === 0 ? (
            <p className="text-muted">No bills waiting to be paid from {info.label}.</p>
          ) : (
            <PendingList items={bills} balances={balances} today={today} compact />
          )}
        </section>
      )}

      {byCategory.length > 0 && (
        <section className="card" aria-labelledby="spent-title">
          <div className="card-header">
            <h2 id="spent-title" className="card-title">
              Spent from {info.label} in {month}
            </h2>
            <p className="amount money-out">{formatMoney(spent)}</p>
          </div>
          <ul className="space-y-3">
            {byCategory.map((c) => {
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
            Activity in {month}
          </h2>
          <span className="row-meta">{activity.length}</span>
        </div>
        {activity.length === 0 ? (
          <p className="text-muted">
            Nothing went in or out of {info.label} in {month}.
          </p>
        ) : (
          <ActivityList items={activity} today={today} />
        )}
      </section>
    </div>
  );
}
