// Marks an element to animate when it scrolls into view (see scroll-reveal.tsx).
// In its own plain file (not "use client") so server components can call it.
import type { CSSProperties } from "react";

// Spread onto an element: <div {...reveal("up", 2)}>
// `order` staggers items in a row: each one starts a little after the last.
export function reveal(kind: "up" | "left" | "right" | "zoom" = "up", order = 0) {
  return {
    "data-reveal": kind,
    style: { "--reveal-delay": `${order * 90}ms` } as CSSProperties,
  };
}

// Only the delay, for the hero's on-load animation: <h1 {...delay(80)} className="hero-in">
export function delay(ms: number) {
  return { style: { "--reveal-delay": `${ms}ms` } as CSSProperties };
}
