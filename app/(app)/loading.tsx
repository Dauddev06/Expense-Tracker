// Shown INSTANTLY when you tap a link, while the server prepares the page.
//
// Why this file makes navigation fast: our pages read the database, so they
// are "dynamic". Next.js only prefetches a dynamic page when it has a
// loading.tsx: it then downloads everything down to this placeholder ahead
// of time. Tapping a link swaps the page right away (no 2-3 second freeze)
// and the real content streams in a moment later.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-48" />
        </div>
        <div className="skeleton h-12 w-full sm:w-80" />
      </div>
      <div className="skeleton h-44 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}
