import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoyPulse – Asia's Good News, in One Place",
  description:
    "A daily digest of real, positive stories from across Asia — Singapore, Malaysia, Indonesia, Thailand, Vietnam, the Philippines, and beyond. Scraped from 18 real RSS sources, filtered for positivity. No server, no tracking, no negativity.",
  keywords: [
    "good news", "happy news", "positive news", "Asia news",
    "Singapore news", "uplifting stories", "inspiring news", "feel good",
  ],
  openGraph: {
    title: "JoyPulse – Asia's Good News, in One Place",
    description: "Real positive stories from CNA, Good News Network, Positive News & more — zero negativity.",
    type: "website",
    locale: "en_SG",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
