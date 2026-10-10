import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listSpendings } from "@/lib/services/spending.service";
import { formatMoney, getCategory } from "@/lib/constants";
import { accountLabel } from "@/lib/accounts";
import { chapterLabel, friendlyDate, readChapterParam, todayString } from "@/lib/dates";
import { ChapterNav } from "@/components/chapter-nav";
import { EmptyState } from "@/components/empty-state";
import { IconTile } from "@/components/icons";
import { PageHeader } from "@/components/page-header";


export const metadata = { title: "Spendings" };
export default async function SpendingsPage({ searchParams }: PageProps<"/spendings">) {
  const { chapter: chapterParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);
  // Server Component: we are ALREADY on the server, so we call the
  // service directly. No fetch, no API route needed for reading.
  const spendings = await listSpendings(user.id, { chapter });
  const total = spendings.reduce((sum, s) => sum + s.amount, 0);
  const today = todayString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spendings"
        description="Everything you paid for, month by month."
        action={
          <Link href="/spendings/new" className="btn-primary">
            Add spending
          </Link>
        }
      />

      <ChapterNav chapter={chapter} basePath="/spendings" />

      {spendings.length === 0 ? (
        <EmptyState
          icon="receipt"
          message={`No spendings in ${chapterLabel(chapter)}. Whenever you buy something, add it here.`}
          actionHref="/spendings/new"
          actionLabel="Add a spending"
        />
      ) : (
        <section className="card" aria-labelledby="list-title">
          <div className="card-header">
            <h2 id="list-title" className="card-title">
              {spendings.length === 1 ? "1 spending" : `${spendings.length} spendings`}
            </h2>
            <p className="font-semibold money-out">{formatMoney(total)} spent</p>
          </div>
          <ul className="-my-3 divide-y divide-line-soft">
            {spendings.map((s) => {
              const cat = getCategory(s.category);
              return (
                <li key={s.id}>
                  {/* Each row links to the DYNAMIC route /spendings/[id] */}
                  <Link href={`/spendings/${s.id}`} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
                    <IconTile name={cat.icon} tone={cat.tile} />
                    <span className="min-w-0 flex-1">
                      <span className="row-title block truncate">{s.title}</span>
                      <span className="row-meta block">
                        {friendlyDate(s.spentOn, today)} · {cat.label} · {accountLabel(s.account)}
                      </span>
                    </span>
                    <span className="font-semibold whitespace-nowrap money-out">
                      −{formatMoney(s.amount)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
