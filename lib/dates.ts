// Small helpers for calendar days ("2026-10-03") and chapters ("2026-10").
// A "chapter" is one calendar month. In code it is the key "YYYY-MM";
// users only ever see it as "October 2026".

// The server (e.g. on Vercel) runs in UTC, but our users live in Pakistan.
// We work out "today" in THIS time zone so the server and the user agree.
// Change it if you live somewhere else.
export const TIME_ZONE = "Asia/Karachi";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// "YYYY-MM-DD" for today in TIME_ZONE. Used on the server.
// ("en-CA" happens to format dates exactly as YYYY-MM-DD.)
export function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  // Reject impossible days like 2026-02-31
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Moves a "YYYY-MM-DD" string by some number of days.
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return result.toISOString().slice(0, 10); // safe: the Date is in UTC
}

// ---------- Chapters (months) ----------

export function isChapter(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function chapterOf(date: string): string {
  return date.slice(0, 7);
}

export function currentChapter(): string {
  return chapterOf(todayString());
}

// "2026-10" -> "October 2026"
export function chapterLabel(chapter: string): string {
  const [y, m] = chapter.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// shiftChapter("2026-12", 1) -> "2027-01"
export function shiftChapter(chapter: string, months: number): string {
  const [y, m] = chapter.split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function chapterStart(chapter: string): string {
  return `${chapter}-01`;
}

export function chapterEnd(chapter: string): string {
  return addDays(chapterStart(shiftChapter(chapter, 1)), -1);
}

// A day of the month inside a chapter: dayInChapter("2026-10", 8) -> "2026-10-08"
export function dayInChapter(chapter: string, day: number): string {
  return `${chapter}-${String(day).padStart(2, "0")}`;
}

// Reads ?chapter=YYYY-MM from the URL, falling back to this month.
// Future months aren't allowed: they become this month.
export function readChapterParam(
  value: string | string[] | undefined,
): string {
  const current = currentChapter();
  return isChapter(value) && value <= current ? value : current;
}

// "YYYY-MM-DD" after today? (Things that already happened can't be in the future.)
export function isFutureDate(date: string): boolean {
  return date > todayString();
}

// ---------- Friendly dates for people ----------

// "Today", "Yesterday", "Tomorrow", "3 Oct", or "3 Oct 2025" (other years)
export function friendlyDate(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  const short = `${d} ${MONTHS[m - 1].slice(0, 3)}`;
  return y === Number(today.slice(0, 4)) ? short : `${short} ${y}`;
}

// The same, for the middle of a sentence: "today", "yesterday", "3 Oct"
export function friendlyDateInline(date: string, today: string): string {
  const text = friendlyDate(date, today);
  return /^\d/.test(text) ? text : text.toLowerCase();
}
