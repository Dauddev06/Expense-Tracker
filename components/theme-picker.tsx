"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/icons";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// The user's choice is kept in this browser (localStorage), not the database:
// it's about this device's screen, like the phone's own dark mode setting.
const STORAGE_KEY = THEME_STORAGE_KEY;
type Choice = "system" | "light" | "dark";

function readChoice(): Choice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyChoice(choice: Choice) {
  if (choice === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", choice);
}

// A tiny store so the buttons re-render when the choice changes
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const OPTIONS: { value: Choice; label: string; icon: IconName }[] = [
  { value: "system", label: "Same as phone", icon: "smartphone" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

export function ThemePicker() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as Choice);

  // In development React re-mounts once and clears attributes on <html>;
  // put the saved theme back before the screen is painted.
  useLayoutEffect(() => {
    applyChoice(readChoice());
  }, []);

  function choose(next: Choice) {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked (private mode): the choice still applies until reload
    }
    applyChoice(next);
    listeners.forEach((listener) => listener());
  }

  return (
    <fieldset>
      <legend className="label">Colours</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const selected = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(option.value)}
              className={`chip flex-col gap-1 py-3 ${selected ? "chip-selected" : ""}`}
            >
              <Icon name={option.icon} className="size-5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
