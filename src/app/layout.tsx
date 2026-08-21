import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Must match next.config.ts — GitHub Pages serves the site under /REPO_NAME
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "JoyPulse";
const isStatic = process.env.STATIC_EXPORT === "true";
const basePath = isStatic ? `/${repoName}` : "";
const siteOrigin = "https://ohkariku-boop.github.io";
const siteUrl = `${siteOrigin}${basePath || ""}`;

const icon = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "JoyPulse – Positive News from Singapore & Asia Daily",
    template: "%s | JoyPulse",
  },
  description:
    "Daily uplifting news from Singapore and Asia. Real positive stories filtered for genuine good news — an antidote to doomscrolling. Free, no account required.",
  keywords: [
    // Head terms
    "good news Asia",
    "positive news Singapore",
    "uplifting news",
    "feel good news",
    // Long-tail
    "daily positive news Singapore",
    "good news website Asia",
    "uplifting stories Southeast Asia",
    "Singapore positive news daily",
    "Asia good news digest",
    "antidote to doomscrolling",
    "happy news Asia morning",
    "positive journalism Asia",
    "good news only website",
    "inspirational news Singapore",
  ],
  authors: [{ name: "JoyPulse" }],
  creator: "JoyPulse",
  publisher: "JoyPulse",
  applicationName: "JoyPulse",
  category: "news",
  themeColor: "#FBBF24",
  alternates: {
    canonical: siteUrl || "/",
  },
  openGraph: {
    title: "JoyPulse – Positive News from Singapore & Asia",
    description:
      "Real positive stories from Singapore and across Asia. A calm daily brief instead of doomscrolling.",
    type: "website",
    locale: "en_SG",
    siteName: "JoyPulse",
    url: siteUrl || undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: "JoyPulse – Asia's Good News Daily",
    description:
      "Positive news from Singapore & Asia. Filtered for genuine uplift. Free daily brief.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "JoyPulse",
  url: siteUrl,
  description:
    "Daily positive news from Singapore and Asia — real uplifting stories filtered for genuine good news.",
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: "JoyPulse",
    url: siteUrl,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={`${basePath}/favicon.ico`} sizes="any" />
        <link rel="icon" href={`${basePath}/favicon.svg`} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
        {/* Privacy-friendly pageviews (GoatCounter) */}
        <script
          data-goatcounter="https://joypulse.goatcounter.com/count"
          async
          src="https://gc.zgo.at/count.js"
        />
      </body>
    </html>
  );
}
