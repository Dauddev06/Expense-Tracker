"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { Icon } from "@/components/icons";
import { LANDING_LINKS } from "@/components/landing/links";

// The bar at the top of the landing page. Laptops see every link;
// phones get a menu button that opens the links in a panel.
export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-surface/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl" aria-label="Pocket Manager home" onClick={close}>
          <BrandMark size="sm" />
          <span className="hidden font-medium text-ink sm:inline">Pocket Manager</span>
        </Link>

        <nav aria-label="Landing page" className="hidden items-center gap-1 lg:flex">
          {LANDING_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-tile sm:inline-flex">
            Log in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
          <button
            type="button"
            className="btn-icon bg-tile lg:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="landing-menu" aria-label="Landing page" className="border-t border-line-soft px-4 pb-4 lg:hidden">
          <ul className="divide-y divide-line-soft">
            {LANDING_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={close} className="flex min-h-12 items-center text-[15px] text-ink">
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" onClick={close} className="flex min-h-12 items-center text-[15px] text-ink">
                Log in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
