import { Brand } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 justify-center overflow-hidden px-4 py-10 sm:items-center sm:py-16">
      {/* A soft brand glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-linear-to-br from-hero-from/25 to-hero-to/20 blur-3xl"
      />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Brand size="md" />
          <p className="text-[15px] text-muted">Every rupee, accounted for.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
