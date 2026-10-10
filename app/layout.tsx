import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// A plain, very readable font with clear numbers
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Each page sets its own title, e.g. "Spendings · My Expense Manager"
  title: { default: "Pocket Manager", template: "%s · Pocket Manager" },
  description:
    "Pocket Manager: every rupee, accounted for. Balances, bills, income, loans and Sadqa in one simple app.",
  applicationName: "Pocket Manager",
};

// Colour of the browser / phone status bar, matching the top bar
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script below may add data-theme
    // to <html> before React loads. That's expected, so React shouldn't warn.
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before the page is painted, so a saved Light/Dark choice never flashes */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
