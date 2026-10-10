"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/icons";

// A pop-up window built on the browser's own <dialog> element. It already
// handles the Escape key and keeps keyboard focus inside while open.
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Keep the real <dialog> in sync with the `open` prop
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      // Phones: a sheet at the bottom of the screen. Bigger screens: centred.
      className="mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-full overflow-y-auto rounded-t-3xl bg-surface p-0 text-ink shadow-2xl ring-1 ring-line sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-2xl"
    >
      {/* Only render the content while open, so forms start fresh each time */}
      {open && (
        <div className="px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
          {/* the little handle bar that tells phone users this is a sheet */}
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="btn-link -mt-2 -mr-2"
              aria-label="Close"
            >
              <Icon name="x" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
