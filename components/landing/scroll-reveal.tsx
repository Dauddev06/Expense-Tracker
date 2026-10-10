"use client";

import { useEffect } from "react";

// Animates every element with a data-reveal attribute as it scrolls into view:
//   <div data-reveal="up">…</div>      (also "left", "right", "zoom")
// It plays EVERY time, not only the first: when an element leaves the screen
// it is reset, so scrolling back to it plays the animation again.
//
// How: an IntersectionObserver (built into the browser) tells us when an
// element enters or leaves the screen. We switch data-visible on and off,
// and the CSS in globals.css does the actual movement.
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];

    // Whatever is ALREADY on screen is shown right away, before the hiding
    // CSS switches on - otherwise it would flash away and back.
    for (const el of elements) {
      const box = el.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) el.dataset.visible = "";
    }
    root.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) el.dataset.visible = "";
          else delete el.dataset.visible; // reset, so it plays again next time
        }
      },
      // A little inside the bottom edge, so the motion is actually seen
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
