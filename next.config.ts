import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When STATIC_EXPORT=true (set in GitHub Actions deploy workflow),
  // produce a fully static export to /out for GitHub Pages.
  // Otherwise, run as a normal Next.js server (for local dev / sandbox).
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
