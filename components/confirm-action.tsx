"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/dialog";
import { useOptimisticItem } from "@/components/optimistic-item";
import { useToast } from "@/components/toast";
import { sendJson } from "@/lib/client-fetch";

type Props = {
  label: string; // the button the user taps first, e.g. "Delete"
  title: string; // dialog title, e.g. "Delete this spending?"
  message: string; // what will happen, e.g. "This will put PKR 450 back into Current."
  confirmLabel: string; // e.g. "Yes, delete it"
  url: string;
  method?: "DELETE" | "POST";
  successMessage: string;
  redirectTo?: string;
  // Also reload the layout (needed when the list of accounts changes)
  refreshLayout?: boolean;
  // The action removes the row it sits in (a delete): hide that row at once,
  // without waiting for the server. Needs an <OptimisticItem> around the row.
  removesItem?: boolean;
  variant?: "danger" | "secondary" | "link";
};

// A button that asks "Are you sure?" (and explains the effect) before it
// changes anything. Used for deletes, undos and "not received".
export function ConfirmAction({
  label,
  title,
  message,
  confirmLabel,
  url,
  method = "DELETE",
  successMessage,
  redirectTo,
  refreshLayout = false,
  removesItem = false,
  variant = "secondary",
}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const item = useOptimisticItem();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-draw the page with fresh data from the server, in the background
  // (startTransition: the screen stays usable while it loads)
  const refreshInBackground = () => startTransition(() => router.refresh());

  async function confirm() {
    // Fast path: remove the row now, ask the server afterwards
    if (removesItem && item && !redirectTo) {
      setOpen(false);
      item.hide();
      showToast(successMessage);
      const { ok, data } = await sendJson(url, method);
      if (!ok) {
        item.show(); // the server said no: put it back, and say why
        showToast(data.message ?? "Couldn't do that. Please try again.", "error");
        return;
      }
      refreshInBackground(); // totals etc. catch up quietly
      return;
    }

    setBusy(true);
    setError(null);
    const { ok, data } = await sendJson(url, method);
    setBusy(false);
    if (!ok) {
      setError(data.message ?? "Something went wrong. Please try again.");
      return;
    }
    setOpen(false);
    showToast(successMessage);
    // Going somewhere else already loads fresh data; staying needs a refresh
    if (redirectTo) router.push(redirectTo);
    if (!redirectTo || refreshLayout) refreshInBackground();
  }

  const buttonClass =
    variant === "danger" ? "btn-danger" : variant === "link" ? "btn-link" : "btn-secondary";

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          setError(null);
          setOpen(true);
          // Load the next page ahead of time, so going there after is instant
          if (redirectTo) router.prefetch(redirectTo);
        }}
      >
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-ink-2">{message}</p>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-negative-soft px-3 py-2 text-sm text-negative">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            No, keep it
          </button>
          <button
            type="button"
            className={variant === "danger" ? "btn-danger" : "btn-primary"}
            onClick={confirm}
            disabled={busy}
          >
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </Dialog>
    </>
  );
}
