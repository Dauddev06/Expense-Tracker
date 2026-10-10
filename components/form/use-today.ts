"use client";

import { useState } from "react";
import { toDateInputValue } from "@/lib/constants";

// "Today" and "Yesterday" as "YYYY-MM-DD" in the user's own time zone.
// Worked out ONCE, when the form first appears: calling new Date() on every
// render would break React's purity rules.
export function useToday() {
  const [days] = useState(() => {
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    return { today: toDateInputValue(now), yesterday: toDateInputValue(yest) };
  });
  return days;
}
