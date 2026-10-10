import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Icon, IconTile, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

const LINKS: { href: string; label: string; icon: IconName; hint: string }[] = [
  { href: "/income", label: "Income", icon: "banknote", hint: "Salary and other money you earn" },
  { href: "/loans", label: "Loans", icon: "users", hint: "Money you lent or borrowed" },
  { href: "/settings", label: "Settings", icon: "settings", hint: "Sadqa %, starting balances" },
];

// The "More" tab on phones: the pages that don't fit in the bottom bar.

export const metadata = { title: "More" };
export default function MorePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="More" />
      <ul className="card divide-y divide-line-soft py-2 sm:py-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
              <IconTile name={link.icon} tone="bg-brand-soft text-brand-ink" />
              <span className="min-w-0 flex-1">
                <span className="row-title block">{link.label}</span>
                <span className="row-meta block">{link.hint}</span>
              </span>
              <Icon name="chevron-right" className="size-5 text-faint" />
            </Link>
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
}
