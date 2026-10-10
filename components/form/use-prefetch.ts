"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Loads the page a form goes to after saving, while you are still typing.
// Then, right after "Save", the page switches at once (showing the loading
// placeholder) instead of waiting for the server to build the whole page.
// <Link> does this by itself; router.push() after saving does not.
export function usePrefetch(href: string | null) {
  const router = useRouter();
  useEffect(() => {
    if (href) router.prefetch(href);
  }, [router, href]);
}
