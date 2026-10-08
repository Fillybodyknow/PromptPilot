import type { MetadataRoute } from "next";

/** เว็บภายในบริษัท — ห้าม search engine ทุกตัวเก็บทุกหน้า (คู่กับ robots: noindex ใน layout.tsx) */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
