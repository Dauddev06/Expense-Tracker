"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { isActive } from "@/components/nav-links";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "Dashboard", icon: "home" },
  { href: "/spendings", label: "Spendings", icon: "receipt" },
  { href: "/expected", label: "Expected", icon: "calendar" },
  { href: "/accounts", label: "Accounts", icon: "bank" },
  { href: "/more", label: "More", icon: "menu" },
];
// Pages reached through "More"
const MORE_PAGES = ["/more", "/income", "/loans", "/settings"];

// Phone navigation: a bar fixed to the bottom of the screen, easy to reach
// with your thumb. Hidden on laptop screens (lg and up).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active =
            tab.href === "/more"
              ? MORE_PAGES.some((href) => isActive(pathname, href))
              : isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
                active ? "text-brand-ink" : "text-muted"
              }`}
            >
              {/* A soft pill behind the active icon */}
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                  active ? "bg-brand-soft" : ""
                }`}
              >
                <Icon name={tab.icon} className="size-5" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
