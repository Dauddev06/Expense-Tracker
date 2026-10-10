"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, IconTile, type IconName } from "@/components/icons";

const QUICK_ACTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: "/spendings/new", label: "Add spending", icon: "receipt" },
  { href: "/money/move", label: "Move money", icon: "move" },
  { href: "/income/new", label: "Add income", icon: "banknote" },
  { href: "/expected/new", label: "Add expected expense", icon: "calendar" },
  { href: "/loans/new", label: "Add loan", icon: "users" },
];

// The floating "+" button is only shown on the main list pages
const MAIN_PAGES = ["/home", "/spendings", "/expected", "/income", "/loans", "/accounts"];

// A round "+" button in the corner that opens a quick menu of common actions.
export function FabMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAccountPage = /^\/accounts\/(current|savings|pocket|sadqa)$/.test(pathname);
  if (!MAIN_PAGES.includes(pathname) && !isAccountPage) return null;

  return (
    <>
      {open && (
        // Tapping anywhere outside the menu closes it
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          className="fixed inset-0 z-40 cursor-default bg-overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className="fixed right-4 bottom-24 z-50 flex flex-col items-end gap-3 lg:right-8 lg:bottom-8"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {open && (
          <ul
            id="quick-menu"
            className="w-64 overflow-hidden rounded-2xl bg-surface p-1.5 shadow-xl ring-1 ring-line"
          >
            {QUICK_ACTIONS.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2 font-medium text-ink hover:bg-surface-2"
                >
                  <IconTile name={action.icon} tone="bg-brand-soft text-brand-ink" size="sm" />
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="quick-menu"
          aria-label={open ? "Close quick menu" : "Add something"}
          onClick={() => setOpen(!open)}
          className="flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong"
        >
          <Icon name={open ? "x" : "plus"} className="size-6" />
        </button>
      </div>
    </>
  );
}
