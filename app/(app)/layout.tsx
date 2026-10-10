import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NavLinks } from "@/components/nav-links";
import { BottomNav } from "@/components/bottom-nav";
import { FabMenu } from "@/components/fab-menu";
import { LogoutButton } from "@/components/logout-button";
import { ToastProvider } from "@/components/toast";
import { Brand } from "@/components/brand";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // not logged in -> go away

  return (
    // The toast lives in the layout, so a "Saved" message survives the
    // navigation that usually follows a save.
    <ToastProvider>
      {/* --nav-space: height of the phone tab bar, so sticky Save buttons sit just above it */}
      <div className="flex flex-1 flex-col [--nav-space:4rem] lg:[--nav-space:0px]">
        <header className="sticky top-0 z-20 border-b border-line-soft bg-surface/85 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
            <Link href="/home" className="shrink-0 rounded-xl" aria-label="Hisaab, go to Dashboard">
              <Brand />
            </Link>
            <NavLinks />
            {/* Laptop screens only: phones log out from More / Settings */}
            <div className="hidden shrink-0 lg:block">
              <LogoutButton />
            </div>
          </div>
        </header>
        {/* pb-32 on phones keeps content clear of the tab bar and + button */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-32 sm:pt-8 lg:pb-16">{children}</main>
        <FabMenu />
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
