import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // min-h-dvh: at least the full screen height. ("dvh" follows the phone's
    // visible height, which changes as the browser bar hides and shows.)
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-x-hidden px-4 py-8">
      {/* A soft brand glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
      />
      {/* my-auto puts the card in the middle of the screen, on phones too.
          (Unlike items-center, it never pushes the top out of reach: when the
          keyboard opens and space runs out, the page simply scrolls.) */}
      <div className="relative mx-auto my-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="rounded-xl" aria-label="Pocket Manager home">
            <Brand size="md" />
          </Link>
          <p className="text-[15px] text-muted">Every rupee, accounted for.</p>
        </div>
        {children}
        <p className="text-center">
          <Link href="/" className="btn-link">
            <Icon name="arrow-left" className="size-4" />
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
