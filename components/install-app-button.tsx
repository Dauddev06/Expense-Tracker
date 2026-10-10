"use client";

import { useState, useSyncExternalStore } from "react";
import { Dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icons";
import { BrandMark } from "@/components/brand";

// ---------------------------------------------------------------------------
// How installing works:
// - Chrome / Edge / Android fire a "beforeinstallprompt" event when the site
//   can be installed. We keep that event, and our button calls .prompt() on
//   it, which opens the browser's real "Install app?" window.
// - Safari on iPhone has no such event. There we show the 3 steps to do it
//   by hand (Share, then "Add to Home Screen").
// ---------------------------------------------------------------------------

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// A tiny store OUTSIDE React, because the browser can fire the event before
// our button is even on the screen. Components read it with useSyncExternalStore.
let savedPrompt: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of the browser's banner
    savedPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    savedPrompt = null;
    justInstalled = true;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const standalone = window.matchMedia("(display-mode: standalone)");
  standalone.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    standalone.removeEventListener("change", listener);
  };
}

type Platform = "ios" | "android" | "desktop";

// Everything we need to know, as one string so React can compare snapshots
function readSnapshot(): string {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const platform: Platform = isIOS
    ? "ios"
    : /Android/i.test(ua)
      ? "android"
      : "desktop";
  // Already opened as an installed app? Then there is nothing to install.
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return [platform, standalone, savedPrompt !== null, justInstalled].join("|");
}

// On the server we can't know, so we assume "desktop, not installed"
const serverSnapshot = () => "desktop|false|false|false";

const STEPS: Record<Platform, { icon: IconName; text: React.ReactNode }[]> = {
  ios: [
    {
      icon: "share",
      text: (
        <>
          Open this site in Safari and tap the <strong>Share</strong> button at
          the bottom.
        </>
      ),
    },
    {
      icon: "plus-square",
      text: (
        <>
          Scroll down and tap <strong>Add to Home Screen</strong>.
        </>
      ),
    },
    {
      icon: "check-circle",
      text: (
        <>
          Tap <strong>Add</strong>. Pocket Manager now sits on your home screen.
        </>
      ),
    },
  ],
  android: [
    {
      icon: "dots-vertical",
      text: (
        <>
          Tap the <strong>menu</strong> button (three dots) at the top right of
          Chrome.
        </>
      ),
    },
    {
      icon: "download",
      text: (
        <>
          Tap <strong>Install app</strong> or{" "}
          <strong>Add to Home screen</strong>.
        </>
      ),
    },
    {
      icon: "check-circle",
      text: (
        <>
          Tap <strong>Install</strong>. Pocket Manager now sits on your home
          screen.
        </>
      ),
    },
  ],
  desktop: [
    {
      icon: "download",
      text: (
        <>
          In Chrome or Edge, click the <strong>install</strong> icon at the
          right end of the address bar.
        </>
      ),
    },
    {
      icon: "dots-vertical",
      text: (
        <>
          Or open the browser menu and choose{" "}
          <strong>Install Pocket Manager</strong>. In Safari on a Mac: File,
          then <strong>Add to Dock</strong>.
        </>
      ),
    },
    {
      icon: "smartphone",
      text: (
        <>
          On your phone, open this website and tap{" "}
          <strong>Install the app</strong>.
        </>
      ),
    },
  ],
};

export function InstallAppButton({
  variant = "card",
}: {
  variant?: "card" | "row";
}) {
  const snapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    serverSnapshot,
  );
  const [platform, standalone, , installed] = snapshot.split("|") as [
    Platform,
    string,
    string,
    string,
  ];
  const [helpOpen, setHelpOpen] = useState(false);

  if (standalone === "true") return null; // we ARE the installed app

  async function install() {
    if (savedPrompt) {
      const prompt = savedPrompt;
      savedPrompt = null; // each prompt can only be used once
      notify();
      await prompt.prompt();
      await prompt.userChoice;
      return;
    }
    setHelpOpen(true); // iPhone, Firefox...: show the steps instead
  }

  const help = (
    <Dialog
      open={helpOpen}
      onClose={() => setHelpOpen(false)}
      title="Add Pocket Manager to your home screen"
    >
      <ol className="space-y-4">
        {STEPS[platform].map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">
              {index + 1}
            </span>
            <span className="flex-1 pt-1 text-ink-2">
              {step.text}
              <Icon
                name={step.icon}
                className="ml-1.5 inline size-4 align-[-2px] text-brand-ink"
              />
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn-primary mt-6 w-full"
        onClick={() => setHelpOpen(false)}
      >
        Got it
      </button>
    </Dialog>
  );

  if (installed === "true") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-positive-soft px-3 py-3 text-positive">
        <Icon name="check-circle" />
        Installed. You&apos;ll find Pocket Manager on your home screen.
      </p>
    );
  }

  if (variant === "row") {
    return (
      <>
        <button
          type="button"
          onClick={install}
          className="list-row -mx-2 w-[calc(100%+1rem)] rounded-xl px-2 text-left hover:bg-surface-2"
        >
          <AppLogo />
          <span className="min-w-0 flex-1">
            <span className="row-title block">Install the app</span>
            <span className="row-meta block">
              Put Pocket Manager on your home screen
            </span>
          </span>
          <Icon name="chevron-right" className="size-5 text-faint" />
        </button>
        {help}
      </>
    );
  }

  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-4">
        <AppLogo />
        <div className="min-w-0 flex-1">
          <p className="card-title">Get the app on your phone</p>
          <p className="mt-0.5 text-sm text-muted">
            Add Pocket Manager to your home screen. It opens like a normal app,
            no app store needed.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={install}
        className="btn-primary w-full sm:w-auto"
      >
        <Icon name="download" className="size-4" />
        Install the app
      </button>
      {help}
    </div>
  );
}

// The same logo as the home-screen icon
function AppLogo() {
  return <BrandMark size="lg" />;
}
