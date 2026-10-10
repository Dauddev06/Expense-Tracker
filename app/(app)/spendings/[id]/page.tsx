import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSpending } from "@/lib/services/spending.service";
import { isUuid } from "@/lib/spending-input";
import { formatMoney, getCategory } from "@/lib/constants";
import { DeleteSpendingButton } from "@/components/delete-spending-button";

// URL /spendings/abc-123  ->  params = Promise<{ id: "abc-123" }>
export default async function SpendingDetailPage({
  params,
}: PageProps<"/spendings/[id]">) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isUuid(id)) notFound();
  const spending = await getSpending(user.id, id);
  if (!spending) notFound(); // shows app/(app)/spendings/[id]/not-found.tsx

  const cat = getCategory(spending.category);

  return (
    <div className="space-y-4">
      <Link
        href="/spendings"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to all spendings
      </Link>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {cat.emoji} {cat.label}
            </p>
            <h1 className="text-2xl font-bold">{spending.title}</h1>
          </div>
          <p className="text-3xl font-bold text-indigo-600">
            {formatMoney(spending.amount)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Date</dt>
            <dd className="font-medium">{spending.spentOn}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Note</dt>
            <dd className="font-medium">{spending.note ?? "—"}</dd>
          </div>
        </dl>

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Link
            href={`/spendings/${spending.id}/edit`}
            className="btn-secondary"
          >
            Edit
          </Link>
          <DeleteSpendingButton id={spending.id} />
        </div>
      </div>
    </div>
  );
}
