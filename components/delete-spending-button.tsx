"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSpendingButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this spending? This cannot be undone.")) return;
    setDeleting(true);

    const res = await fetch(`/api/spendings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Could not delete. Please try again.");
      setDeleting(false);
      return;
    }

    router.push("/spendings");
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={deleting} className="btn-danger">
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
