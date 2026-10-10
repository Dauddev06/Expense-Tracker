import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ToastProvider } from "@/components/toast";
import { Brand } from "@/components/brand";

// A calm layout with no menus, just for the first-time welcome steps.
export default async function WelcomeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ToastProvider>
      {/* my-auto: in the middle of the screen, on phones too (see (auth)/layout.tsx) */}
      <main className="flex min-h-dvh flex-1 flex-col px-4 py-8 sm:py-12">
        <div className="mx-auto my-auto w-full max-w-lg space-y-6">
          <Brand />
          {children}
        </div>
      </main>
    </ToastProvider>
  );
}
