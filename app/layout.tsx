import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// A friendly, very readable font with clear numbers
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Each page sets its own title, e.g. "Spendings · Hisaab"
  title: { default: "Hisaab", template: "%s · Hisaab" },
  description: "Hisaab: every rupee, accounted for. Balances, bills, income, loans and Sadqa in one simple app.",
  applicationName: "Hisaab",
  // iPhone / iPad: name under the home-screen icon, and open full-screen.
  // (The icon itself comes from app/apple-icon.png.)
  appleWebApp: {
    capable: true,
    title: "Hisaab",
    statusBarStyle: "default",
  },
};

// Colour of the browser / phone status bar, matching the top bar
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121825" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script below may add data-theme
    // to <html> before React loads. That's expected, so React shouldn't warn.
    <html lang="en" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before the page is painted, so a saved Light/Dark choice never flashes */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
