import type { NextConfig } from "next";

// Set at build time only when the site is served under a sub-path (e.g.
// "/promptpilot" behind a shared intranet host — see DEPLOY.md); empty means
// the domain root. See src/lib/basePath.ts for the matching
// client-side helper that prefixes raw asset paths (next/image's src is not
// auto-prefixed by basePath the way next/link hrefs are).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Runs as a Node server (not `output: "export"`): the news admin needs Proxy,
// Server Actions and live SQLite reads, none of which static export supports.
const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  // /explore ถูกแทนด้วย /guides — redirect ถาวร กันลิงก์เก่าที่แชร์ไว้เสีย
  async redirects() {
    return [
      { source: "/explore", destination: "/guides", permanent: true },
      { source: "/explore/:category", destination: "/guides/:category", permanent: true },
    ];
  },
  // รูปพื้นหลังผ่าน image optimizer ของ Next (ย่อตามจอ + AVIF/WebP) — โลโก้ต่างๆ ยังส่ง `unoptimized` เองทีละตัว
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
