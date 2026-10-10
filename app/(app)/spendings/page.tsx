import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listSpendings } from "@/lib/services/spending.service";
import { formatMoney, getCategory } from "@/lib/constants";

export default async function SpendingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Server Component: we are ALREADY on the server, so we call the
  // service directly. No fetch, no API route needed for reading.
  const spendings = await listSpendings(user.id);
  const total = spendings.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your spendings</h1>
          <p className="text-sm text-slate-500">
            {spendings.length} entries · {formatMoney(total)} total
          </p>
        </div>
        <Link href="/spendings/new" className="btn-primary">
          + Add spending
        </Link>
      </div>

      {spendings.length === 0 ? (
        <div className="card text-center text-slate-500">
          No spendings yet.{" "}
          <Link
            href="/spendings/new"
            className="text-indigo-600 hover:underline"
          >
            Add your first one
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {spendings.map((s) => {
            const cat = getCategory(s.category);
            return (
              <li key={s.id}>
                {/* Each row links to the DYNAMIC route /spendings/[id] */}
                <Link
                  href={`/spendings/${s.id}`}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-slate-500">
                        {cat.label} · {s.spentOn}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">{formatMoney(s.amount)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
