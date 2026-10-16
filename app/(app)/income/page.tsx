import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ensureThisMonthIncome, listIncomes, type IncomeDTO } from "@/lib/services/income.service";
import { getAllAccountNames } from "@/lib/services/savings-account.service";
import { accountLabel } from "@/lib/accounts";
import { getSettings } from "@/lib/services/settings.service";
import { getBalances } from "@/lib/services/balance.service";
import { formatMoney } from "@/lib/constants";
import { chapterLabel, friendlyDateInline, readChapterParam, todayString } from "@/lib/dates";
import { ChapterNav } from "@/components/chapter-nav";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/confirm-action";
import { OptimisticItem } from "@/components/optimistic-item";
import { ReceiveIncomeButton } from "@/components/receive-income-button";
import { Icon, IconTile } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";


export const metadata = { title: "Income" };
export default async function IncomePage({ searchParams }: PageProps<"/income">) {
  const { chapter: chapterParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);
  const [incomes, settings, balances, accounts] = await Promise.all([
    // New month: last month's "Every month" incomes are copied in first
    ensureThisMonthIncome(user.id, chapter).then(() => listIncomes(user.id, chapter)),
    getSettings(user.id),
    getBalances(user.id),
    getAllAccountNames(user.id),
  ]);
  const today = todayString();
  const expected = incomes.reduce((sum, i) => sum + i.amount, 0);
  const received = incomes
    .filter((i) => i.status === "received")
    .reduce((sum, i) => sum + i.amount, 0);

  // "today", "yesterday" or "on 3 Oct"
  const receivedWhen = (date: string) => {
    const day = friendlyDateInline(date, today);
    return /^\d/.test(day) ? `on ${day}` : day;
  };

  // What undoing a received income does, in plain words
  const takeBack = (income: IncomeDTO) => {
    const parts = [`${formatMoney(income.amount - income.savingsAmount)} back out of Current`];
    if (income.sadqaAmount > 0) parts.push(`${formatMoney(income.sadqaAmount)} off your Sadqa to give`);
    if (income.savingsAmount > 0 && income.savingsAccountApplied) {
      parts.push(`${formatMoney(income.savingsAmount)} out of ${accountLabel(income.savingsAccountApplied, accounts)}`);
    }
    return `This will take ${parts.join(", ").replace(/, ([^,]*)$/, " and $1")}.`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Money you earn. It goes into Current, and “Every month” income comes back by itself each month."
        action={
          <Link href={`/income/new?chapter=${chapter}`} className="btn-primary">
            Add income
          </Link>
        }
      />

      <ChapterNav chapter={chapter} basePath="/income" />

      {incomes.length === 0 ? (
        <EmptyState
          icon="banknote"
          message={`No income added for ${chapterLabel(chapter)} yet. Add your salary or any money you expect to earn.`}
          actionHref={`/income/new?chapter=${chapter}`}
          actionLabel="Add income"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Received" value={formatMoney(received)} tone="in" />
            <StatCard label="Expected in total" value={formatMoney(expected)} />
          </div>

          <ul className="space-y-3">
            {incomes.map((income) => (
              <OptimisticItem key={income.id} className="card">
                <div className="flex items-start gap-3">
                  <IconTile name="banknote" tone="bg-positive-soft text-positive" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="row-title">{income.title}</h2>
                      <p className="font-semibold whitespace-nowrap text-ink tabular-nums">
                        {formatMoney(income.amount)}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {income.status === "received" ? (
                        <>
                          <span className="badge bg-positive-soft text-positive">
                            <Icon name="check" className="size-3.5" />
                            Received {receivedWhen(income.receivedOn!)}
                          </span>
                          {income.sadqaAmount > 0 && (
                            <span className="row-meta">{formatMoney(income.sadqaAmount)} added to Sadqa to give</span>
                          )}
                          {income.savingsAmount > 0 && income.savingsAccountApplied && (
                            <span className="badge bg-positive-soft text-positive">
                              <Icon name="piggy" className="size-3.5" />
                              {formatMoney(income.savingsAmount)} saved into{" "}
                              {accountLabel(income.savingsAccountApplied, accounts)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="badge bg-warning-soft text-warning">
                          <Icon name="clock" className="size-3.5" />
                          Not received yet
                        </span>
                      )}
                      {income.repeats && (
                        <span className="badge bg-tile text-ink-2">
                          <Icon name="repeat" className="size-3.5" />
                          Every month
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {income.status === "received" ? (
                        <ConfirmAction
                          label="Not received"
                          title="Mark as not received?"
                          message={takeBack(income)}
                          confirmLabel="Yes, not received"
                          method="DELETE"
                          url={`/api/income/${income.id}/receive`}
                          successMessage="Marked as not received"
                        />
                      ) : (
                        <ReceiveIncomeButton income={income} settings={settings} balances={balances} />
                      )}
                      <Link href={`/income/${income.id}/edit`} className="btn-secondary">
                        Edit
                      </Link>
                      <ConfirmAction
                        variant="danger"
                        label="Delete"
                        title={`Delete ${income.title}?`}
                        message={`${
                          income.status === "received"
                            ? takeBack(income)
                            : "It hasn't been received, so your balances won't change."
                        }${
                          income.repeats
                            ? " Only this month's is deleted: it still comes back next month. To stop that, edit it and choose \u201cJust this month\u201d."
                            : ""
                        }`}
                        confirmLabel="Yes, delete it"
                        url={`/api/income/${income.id}`}
                        successMessage="Income deleted"
                        removesItem
                      />
                    </div>
                  </div>
                </div>
              </OptimisticItem>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
