import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  ensureChapterOccurrences,
  listCarriedOver,
  listPlanned,
  summarizePlanned,
} from "@/lib/services/expected.service";
import { getUserAccounts } from "@/lib/services/savings-account.service";
import { getBalances } from "@/lib/services/balance.service";
import { formatMoney } from "@/lib/constants";
import { chapterLabel, currentChapter, readChapterParam, todayString } from "@/lib/dates";
import { ChapterNav } from "@/components/chapter-nav";
import { EmptyState } from "@/components/empty-state";
import { PaidList, PendingList } from "@/components/planned-list";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";


export const metadata = { title: "Expected expenses" };
export default async function ExpectedPage({ searchParams }: PageProps<"/expected">) {
  const { chapter: chapterParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);
  // Create this month's repeating items first (safe to do on every visit)
  await ensureChapterOccurrences(user.id, chapter);
  const isThisMonth = chapter === currentChapter();
  const [items, balances, accounts, carried] = await Promise.all([
    listPlanned(user.id, chapter),
    getBalances(user.id),
    getUserAccounts(user.id),
    // A new month never hides unpaid bills: they show up here until paid
    isThisMonth ? listCarriedOver(user.id, chapter) : Promise.resolve([]),
  ]);
  const today = todayString();
  const pending = items.filter((i) => i.status === "pending");
  const paid = items.filter((i) => i.status === "done");
  const summary = summarizePlanned(items);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expected expenses"
        description="Bills and costs you plan to pay this month."
        action={
          <Link href={`/expected/new?chapter=${chapter}`} className="btn-primary">
            Add expected expense
          </Link>
        }
      />

      <ChapterNav chapter={chapter} basePath="/expected" />

      {carried.length > 0 && (
        <section className="card ring-warning-line" aria-labelledby="carried-title">
          <div className="card-header">
            <h2 id="carried-title" className="card-title">
              Not paid from earlier months
            </h2>
            <span className="row-meta">{carried.length} left</span>
          </div>
          <PendingList items={carried} balances={balances} today={today} accounts={accounts} />
        </section>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="calendar"
          message={`Nothing planned for ${chapterLabel(chapter)}. Add bills like rent or electricity so you know what's coming.`}
          actionHref={`/expected/new?chapter=${chapter}`}
          actionLabel="Add expected expense"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard compact label="To pay" value={formatMoney(summary.stillToPay)} />
            <StatCard compact label="Paid" value={formatMoney(summary.paid)} />
            <StatCard compact label="Total" value={formatMoney(summary.total)} />
          </div>

          <section className="card" aria-labelledby="pending-title">
            <div className="card-header">
              <h2 id="pending-title" className="card-title">
                Still to pay
              </h2>
              <span className="row-meta">{pending.length} left</span>
            </div>
            {pending.length === 0 ? (
              <p className="flex items-center gap-2 text-positive">
                <Icon name="check-circle" />
                Everything for {chapterLabel(chapter)} is paid.
              </p>
            ) : (
              <PendingList items={pending} balances={balances} today={today} accounts={accounts} />
            )}
          </section>

          {paid.length > 0 && (
            <section className="card" aria-labelledby="paid-title">
              <div className="card-header">
                <h2 id="paid-title" className="card-title">
                  Paid
                </h2>
                <span className="row-meta">{paid.length} done</span>
              </div>
              <PaidList items={paid} today={today} accounts={accounts} />
            </section>
          )}
        </>
      )}

      <Link href="/expected/recurring" className="btn-link -ml-3">
        <Icon name="repeat" className="size-4" />
        Manage repeating expenses
      </Link>
    </div>
  );
}
