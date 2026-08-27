import type { NextConfig } from "next";

// Set by the GitHub Pages deploy workflow (.github/workflows/deploy.yml) to
// "/PromptPilot" — empty locally, so `next dev`/`next build` outside CI still
// serve from the domain root. See src/lib/basePath.ts for the matching
// client-side helper that prefixes raw asset paths (next/image's src is not
// auto-prefixed by basePath the way next/link hrefs are).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    // GitHub Pages has no image optimization server — every <Image> in this
    // app already passes `unoptimized` individually, but this is the
    // required global flag for `output: "export"` regardless.
    unoptimized: true,
  },
};

export default nextConfig;
