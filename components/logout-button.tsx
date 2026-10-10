"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

// compact = icon only (the laptop sidebar)
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (compact) {
    return (
      <button onClick={handleLogout} disabled={loading} className="btn-icon" aria-label="Log out" title="Log out">
        <Icon name="logout" className="size-[18px]" />
      </button>
    );
  }

  return (
    <button onClick={handleLogout} disabled={loading} className="btn-secondary whitespace-nowrap">
      <Icon name="logout" className="size-4" />
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
