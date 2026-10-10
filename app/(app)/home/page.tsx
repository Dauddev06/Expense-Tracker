import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listUserNames } from "@/lib/services/user.service";
import { getSummary, listSpendings } from "@/lib/services/spending.service";
import { formatMoney, getCategory } from "@/lib/constants";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Run the three independent queries at the same time
  const [summary, recent] = await Promise.all([
    getSummary(user.id),
    listSpendings(user.id, 5),
    listUserNames(),
  ]);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h1 className="text-3xl font-bold">{user.name} 👋</h1>
        </div>
        <Link href="/spendings/new" className="btn-primary">
          + Add today&apos;s spending
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Spent today" value={formatMoney(summary.today)} />
        <StatCard label="Spent this month" value={formatMoney(summary.month)} />
        <StatCard label="Total entries" value={String(summary.count)} />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent spendings</h2>
          <Link
            href="/spendings"
            className="text-sm text-indigo-600 hover:underline"
          >
            See all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing yet — add your first spending!
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/spendings/${s.id}`}
                  className="flex justify-between py-2 text-sm hover:text-indigo-600"
                >
                  <span>
                    {getCategory(s.category).emoji} {s.title}
                  </span>
                  <span className="font-medium">{formatMoney(s.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
