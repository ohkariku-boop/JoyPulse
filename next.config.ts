import type { NextConfig } from "next";

// Derive the repo name automatically from GITHUB_REPOSITORY (owner/repo),
// which GitHub Actions sets automatically — no hardcoding needed, and this
// still works correctly if the repo is ever renamed or forked.
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isStaticExport = process.env.STATIC_EXPORT === "true";

// GitHub Pages project sites (username.github.io/REPO_NAME/) serve everything
// under a subpath, so Next.js needs to know that subpath to generate correct
// asset URLs (CSS, JS, etc.). Without this, all asset requests 404 silently
// and the page renders as unstyled raw HTML.
const basePath = isStaticExport && repoName ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export", basePath, assetPrefix: basePath } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
