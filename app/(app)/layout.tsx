import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUserAccounts } from "@/lib/services/savings-account.service";
import { NavLinks } from "@/components/nav-links";
import { BottomNav } from "@/components/bottom-nav";
import { FabMenu } from "@/components/fab-menu";
import { LogoutButton } from "@/components/logout-button";
import { ToastProvider } from "@/components/toast";
import { AccountsProvider } from "@/components/accounts-context";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // not logged in -> go away

  // Loaded once here (layouts are NOT re-rendered on every page change)
  const accounts = await getUserAccounts(user.id);
  const initials = user.name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    // The toast lives in the layout, so a "Saved" message survives the
    // navigation that usually follows a save.
    <ToastProvider>
      <AccountsProvider accounts={accounts}>
        {/* --nav-space: height of the phone tab bar, so sticky Save buttons sit just above it */}
        <div className="flex flex-1 flex-col [--nav-space:4rem] lg:pl-64 lg:[--nav-space:0px]">
          {/* Laptop: a sidebar on the left */}
          <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-sidebar lg:flex">
            <Link href="/home" className="mx-3 mt-4 mb-5 rounded-xl px-2 py-1" aria-label="Pocket Manager, go to Dashboard">
              <Brand />
            </Link>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks />
            </div>
            <div className="flex items-center gap-3 border-t border-line px-4 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
              <LogoutButton compact />
            </div>
          </aside>

          {/* Phones and tablets: a top bar (the tabs are at the bottom) */}
          <header className="sticky top-0 z-20 border-b border-line-soft bg-surface/85 backdrop-blur-lg lg:hidden">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
              <Link href="/home" className="shrink-0 rounded-xl" aria-label="Pocket Manager, go to Dashboard">
                <Brand />
              </Link>
              <Link href="/settings" className="btn-icon -mr-2" aria-label="Settings">
                <Icon name="settings" />
              </Link>
            </div>
          </header>

          {/* pb-32 on phones keeps content clear of the tab bar and + button */}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-32 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16">
            {children}
          </main>
          <FabMenu />
          <BottomNav />
        </div>
      </AccountsProvider>
    </ToastProvider>
  );
}
