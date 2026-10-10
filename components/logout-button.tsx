"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} disabled={loading} className="btn-secondary whitespace-nowrap">
      <Icon name="logout" className="size-4" />
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
