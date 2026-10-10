"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Every main page. The desktop top bar shows all of them.
export const NAV_LINKS = [
  { href: "/home", label: "Dashboard" },
  { href: "/spendings", label: "Spendings" },
  { href: "/expected", label: "Expected" },
  { href: "/income", label: "Income" },
  { href: "/loans", label: "Loans" },
  { href: "/accounts", label: "Accounts" },
  { href: "/settings", label: "Settings" },
];

export function isActive(pathname: string, href: string) {
  // The money actions (/money/move...) belong to the Accounts section
  if (href === "/accounts" && pathname.startsWith("/money/")) return true;
  return pathname === href || pathname.startsWith(href + "/");
}

// Top navigation for laptop screens (phones and tablets use BottomNav)
export function NavLinks() {
  const pathname = usePathname(); // e.g. "/spendings/123"

  return (
    <nav aria-label="Main" className="hidden gap-1 lg:flex">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-tile"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
