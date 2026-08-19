import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoyPulse – Asia's Good News, in One Place",
  description:
    "A daily digest of real, positive stories from across Asia — Singapore first, then Malaysia, Indonesia, Thailand, Vietnam, the Philippines, India and beyond. Filtered for genuine uplift. No tracking, no negativity, just the good stuff.",
  keywords: [
    "good news", "happy news", "positive news", "Asia good news",
    "Singapore good news", "uplifting stories Asia", "inspiring news",
    "feel good news", "positive journalism Asia", "antidote to doomscrolling",
  ],
  authors: [{ name: "JoyPulse" }],
  openGraph: {
    title: "JoyPulse – Asia's Good News, in One Place",
    description:
      "Real positive stories from across Asia. Singapore spotlight + the best from the region. Zero negativity.",
    type: "website",
    locale: "en_SG",
    siteName: "JoyPulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "JoyPulse – Asia's Good News",
    description: "A beautiful daily relief from the chaos. Real positive stories from Asia.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
