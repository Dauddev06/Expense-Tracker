// The landing page's links, in their own plain file: both the header
// (a "use client" component) and the page (a server component) use them.
// A server component can't read plain values out of a "use client" file;
// it only gets a reference to them, so the list must live here.
// "#features" etc. are ids of sections further down the landing page:
// clicking one scrolls there (no new page loads).
export const LANDING_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#sadqa", label: "Sadqa" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];
