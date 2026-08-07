import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoyPulse – Only Good News from Singapore & Asia",
  description:
    "A static feed of happy, exciting, and inspiring news from Singapore and Asia. Scraped from 9 real RSS sources, filtered for positivity. No server, no tracking, no negativity.",
  keywords: [
    "good news", "happy news", "positive news", "Singapore news",
    "Asia news", "uplifting stories", "inspiring news", "feel good",
  ],
  openGraph: {
    title: "JoyPulse – Only Good News from Singapore & Asia",
    description: "Real positive stories from CNA, Mothership, Good News Network & more — zero negativity.",
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
