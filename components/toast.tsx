"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Icon } from "@/components/icons";

// A tiny "Saved" message that appears at the bottom and fades out.
// Built with plain React state (no extra packages):
//   const showToast = useToast();
//   showToast("PKR 5,000 moved to Savings");
//   showToast("Couldn't delete it. Try again.", "error");
type Tone = "success" | "error";
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // `id` changes for every new message, which restarts the CSS animation
  const [toast, setToast] = useState<{ id: number; message: string; tone: Tone } | null>(null);

  const show = useCallback((message: string, tone: Tone = "success") => {
    setToast((old) => ({ id: (old?.id ?? 0) + 1, message, tone }));
  }, []);

  // Remove the message after the fade-out animation has finished
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      {/* aria-live: screen readers read the message out loud */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 lg:bottom-8"
      >
        {toast && (
          <div
            key={toast.id}
            // "Inverse" colours: dark in light mode, light in dark mode
            className="toast flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-canvas shadow-xl"
          >
            {toast.tone === "error" ? (
              <Icon name="alert" className="size-5 text-negative-solid" />
            ) : (
              <Icon name="check-circle" className="size-5 text-positive-solid" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
