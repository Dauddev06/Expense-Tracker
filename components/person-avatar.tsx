// A round badge with the first letter of a name, e.g. "A" for Ali.
export function PersonAvatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tone}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
