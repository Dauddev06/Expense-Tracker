// A small dark "screen" used as an illustration on the landing page:
//   October 2026 · in progress
//   ● Rent        15,000  [To pay]
//   ● Salary     120,000  [Received]
export type MockRow = {
  label: string;
  value: string;
  tag?: string;
  // dot + tag colour: what kind of row it is
  tone?: "neutral" | "good" | "wait" | "bad";
};

const DOT = {
  neutral: "bg-zinc-500",
  good: "bg-emerald-400",
  wait: "bg-amber-400",
  bad: "bg-rose-400",
};
const TAG = {
  neutral: "bg-white/10 text-zinc-300",
  good: "bg-emerald-400/15 text-emerald-300",
  wait: "bg-amber-400/15 text-amber-200",
  bad: "bg-rose-400/15 text-rose-300",
};

export function MockList({
  title,
  aside,
  rows,
  footer,
}: {
  title: string;
  aside?: string;
  rows: MockRow[];
  footer?: React.ReactNode;
}) {
  return (
    <div aria-hidden="true" className="rounded-xl bg-[#1d1d22] p-4 text-zinc-100 shadow-xl shadow-black/10 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-zinc-300">{title}</span>
        {aside && <span className="text-zinc-500">{aside}</span>}
      </div>
      <ul className="space-y-2">
        {rows.map((row) => {
          const tone = row.tone ?? "neutral";
          return (
            <li key={row.label} className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm">
              <span className={`size-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <span className="tabular-nums text-zinc-200">{row.value}</span>
              {row.tag && <span className={`rounded px-1.5 py-0.5 text-[11px] ${TAG[tone]}`}>{row.tag}</span>}
            </li>
          );
        })}
      </ul>
      {footer && <div className="mt-4 border-t border-white/10 pt-3 text-[13px] text-zinc-400">{footer}</div>}
    </div>
  );
}
