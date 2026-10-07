import type { NextConfig } from "next";

// Set by the GitHub Pages deploy workflow (.github/workflows/deploy.yml) to
// "/PromptPilot" — empty locally, so `next dev`/`next build` outside CI still
// serve from the domain root. See src/lib/basePath.ts for the matching
// client-side helper that prefixes raw asset paths (next/image's src is not
// auto-prefixed by basePath the way next/link hrefs are).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Runs as a Node server (not `output: "export"`): the news admin needs Proxy,
// Server Actions and live SQLite reads, none of which static export supports.
const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    // Every <Image> already passes `unoptimized`; kept global so behavior
    // matches what was deployed on GitHub Pages.
    unoptimized: true,
  },
};

export default nextConfig;
