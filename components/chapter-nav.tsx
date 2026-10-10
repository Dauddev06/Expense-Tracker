import Link from "next/link";
import { chapterLabel, currentChapter, shiftChapter } from "@/lib/dates";
import { Icon } from "@/components/icons";

// The month switcher:  [‹]  October 2026  [›]
// You can go back to earlier months, but never past this month:
// on this month the › arrow is switched off.
export function ChapterNav({ chapter, basePath }: { chapter: string; basePath: string }) {
  const current = currentChapter();
  const prev = shiftChapter(chapter, -1);
  const next = shiftChapter(chapter, 1);
  const isThisMonth = chapter >= current;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <nav
        aria-label="Choose a month"
        className="flex w-full items-center gap-1 rounded-2xl bg-surface p-1 shadow-[var(--card-shadow)] ring-1 ring-line sm:w-80"
      >
        <Link
          href={`${basePath}?chapter=${prev}`}
          className="btn-icon"
          aria-label={`Previous month: ${chapterLabel(prev)}`}
        >
          <Icon name="chevron-left" />
        </Link>
        <p className="flex min-w-0 flex-1 flex-col items-center leading-tight" aria-live="polite">
          <span className="text-[15px] font-bold text-ink">{chapterLabel(chapter)}</span>
          <span className="text-xs font-medium text-muted">
            {isThisMonth ? "This month" : chapter === shiftChapter(current, -1) ? "Last month" : "Past month"}
          </span>
        </p>
        {isThisMonth ? (
          // Future months are not allowed, so the arrow is switched off
          <button type="button" disabled className="btn-icon" aria-label="Next month (not available yet)">
            <Icon name="chevron-right" />
          </button>
        ) : (
          <Link
            href={next === current ? basePath : `${basePath}?chapter=${next}`}
            className="btn-icon"
            aria-label={`Next month: ${chapterLabel(next)}`}
          >
            <Icon name="chevron-right" />
          </Link>
        )}
      </nav>
      {!isThisMonth && (
        <Link href={basePath} className="btn-link">
          <Icon name="calendar" className="size-4" />
          Back to this month
        </Link>
      )}
    </div>
  );
}
