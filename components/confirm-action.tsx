"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/dialog";
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
  variant = "secondary",
}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
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
    if (redirectTo) router.push(redirectTo);
    router.refresh();
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
