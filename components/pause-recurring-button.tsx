"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { sendJson } from "@/lib/client-fetch";
import type { RecurringDTO } from "@/lib/services/expected.service";

// One tap to pause or resume a repeating expense.
export function PauseRecurringButton({ recurring }: { recurring: RecurringDTO }) {
  const router = useRouter();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const { ok, data } = await sendJson(`/api/recurring/${recurring.id}`, "PATCH", {
      title: recurring.title,
      amount: recurring.amount,
      category: recurring.category,
      account: recurring.account,
      frequency: recurring.frequency,
      active: !recurring.active,
    });
    setBusy(false);
    if (!ok) {
      setError(data.message ?? "Something went wrong. Please try again.");
      return;
    }
    showToast(recurring.active ? `${recurring.title} paused` : `${recurring.title} is on again`);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={toggle} disabled={busy}>
        {busy ? "Saving..." : recurring.active ? "Pause" : "Resume"}
      </button>
      {error && <p role="alert" className="error-text w-full">{error}</p>}
    </>
  );
}
