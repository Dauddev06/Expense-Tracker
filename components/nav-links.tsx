"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

// Every main page. The laptop sidebar shows all of them.
export const NAV_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "Dashboard", icon: "home" },
  { href: "/accounts", label: "Accounts", icon: "bank" },
  { href: "/spendings", label: "Spendings", icon: "receipt" },
  { href: "/expected", label: "Expected", icon: "calendar" },
  { href: "/income", label: "Income", icon: "banknote" },
  { href: "/loans", label: "Loans", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function isActive(pathname: string, href: string) {
  // The money actions (/money/move...) belong to the Accounts section
  if (href === "/accounts" && pathname.startsWith("/money/")) return true;
  return pathname === href || pathname.startsWith(href + "/");
}

// The sidebar on laptop screens (phones and tablets use BottomNav)
export function NavLinks() {
  const pathname = usePathname(); // e.g. "/spendings/123"

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
              active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-tile"
            }`}
          >
            {/* The thin bar on the left of the page you're on */}
            {active && <span aria-hidden="true" className="absolute inset-y-2 -left-2 w-0.5 rounded-full bg-brand" />}
            <Icon name={link.icon} className="size-[18px]" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
