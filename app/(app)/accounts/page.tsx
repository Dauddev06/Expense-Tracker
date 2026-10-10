import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalances } from "@/lib/services/balance.service";
import { listActivity } from "@/lib/services/activity.service";
import { getUserAccounts } from "@/lib/services/savings-account.service";
import { accountLabel, balanceOf, isAccount } from "@/lib/accounts";
import { todayString } from "@/lib/dates";
import { BalanceCards } from "@/components/balance-cards";
import { ActivityList } from "@/components/activity-list";
import { Icon, IconTile, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

const ACTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: "/money/add", label: "Add money", icon: "plus-circle" },
  { href: "/money/move", label: "Move money", icon: "move" },
  { href: "/money/borrow", label: "Borrow from savings", icon: "arrow-out" },
  { href: "/money/repay", label: "Pay savings back", icon: "arrow-in" },
  { href: "/money/sadqa", label: "Give Sadqa", icon: "heart" },
];

export const metadata = { title: "Accounts" };
export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const { account } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [accounts, balances] = await Promise.all([getUserAccounts(user.id), getBalances(user.id)]);
  // Only filter by accounts the user really has
  const filter = isAccount(account) && accounts.some((a) => a.value === account) ? account : undefined;
  const activity = await listActivity(user.id, { account: filter, limit: 50 });
  const today = todayString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Tap an account to see its bills, loans and activity."
        action={
          <Link href="/accounts/new" className="btn-secondary">
            <Icon name="plus" className="size-4" />
            Add a savings account
          </Link>
        }
      />

      <BalanceCards cards={accounts.map((info) => ({ info, balance: balanceOf(balances, info.value) }))} />

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="card-title mb-3">
          What would you like to do?
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="card flex min-h-24 flex-col items-start justify-between gap-3 p-4 text-sm font-medium text-ink transition last:col-span-2 hover:ring-brand/40 sm:p-4 sm:last:col-span-1"
            >
              <IconTile name={action.icon} tone="bg-brand-soft text-brand-ink" size="sm" />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="activity-title" className="card">
        <h2 id="activity-title" className="card-title">
          {filter ? `${accountLabel(filter, accounts)} activity` : "All activity"}
        </h2>
        <nav aria-label="Show activity for" className="mt-3 mb-5 flex flex-wrap gap-2">
          <Link
            href="/accounts"
            className={`chip ${!filter ? "chip-selected" : ""}`}
            aria-current={!filter ? "page" : undefined}
          >
            All
          </Link>
          {accounts.map((a) => (
            <Link
              key={a.value}
              href={`/accounts?account=${a.value}`}
              aria-current={filter === a.value ? "page" : undefined}
              className={`chip ${filter === a.value ? "chip-selected" : ""}`}
            >
              <Icon name={a.icon} className="size-4" />
              {a.label}
            </Link>
          ))}
        </nav>
        {activity.length === 0 ? (
          <p className="py-4 text-center text-muted">
            Nothing here yet. Money you add, move or spend will show up here.
          </p>
        ) : (
          <ActivityList items={activity} today={today} />
        )}
      </section>

      <Link href="/accounts/opening" className="btn-link -ml-3">
        <Icon name="pencil" className="size-4" />
        Change starting balances
      </Link>
    </div>
  );
}
