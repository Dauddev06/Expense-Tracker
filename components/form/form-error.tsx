// The red box at the top of a form for errors that don't belong to one field.
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl bg-negative-soft px-3 py-2 text-sm text-negative">
      {message}
    </div>
  );
}
