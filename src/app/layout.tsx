import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Must match next.config.ts — GitHub Pages serves the site under /REPO_NAME
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "JoyPulse";
const basePath =
  process.env.STATIC_EXPORT === "true" ? `/${repoName}` : "";

const icon = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "JoyPulse – Asia's Good News, in One Place",
  description:
    "A daily digest of real, positive stories from across Asia — Singapore first, then Malaysia, Indonesia, Thailand, Vietnam, the Philippines, India and beyond. Filtered for genuine uplift. No accounts, no ads — just the good stuff.",
  keywords: [
    "good news", "happy news", "positive news", "Asia good news",
    "Singapore good news", "uplifting stories Asia", "inspiring news",
    "feel good news", "positive journalism Asia", "antidote to doomscrolling",
  ],
  authors: [{ name: "JoyPulse" }],
  applicationName: "JoyPulse",
  themeColor: "#FBBF24",
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
  icons: {
    icon: [
      { url: icon("/favicon.ico"), sizes: "any" },
      { url: icon("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: icon("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: icon("/favicon.svg"), type: "image/svg+xml" },
    ],
    apple: [{ url: icon("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    shortcut: icon("/favicon.ico"),
  },
  manifest: icon("/site.webmanifest"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Explicit tags so browsers always resolve icons under the GitHub Pages base path */}
        <link rel="icon" href={`${basePath}/favicon.ico`} sizes="any" />
        <link rel="icon" href={`${basePath}/favicon.svg`} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
        {/* Privacy-friendly pageviews (GoatCounter) — no ads, no personal profiles */}
        <script
          data-goatcounter="https://joypulse.goatcounter.com/count"
          async
          src="https://gc.zgo.at/count.js"
        />
      </body>
    </html>
  );
}
