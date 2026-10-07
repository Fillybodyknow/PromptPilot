/**
 * Prefix for static asset paths under `public/`. Empty when served from the
 * domain root; set via the NEXT_PUBLIC_BASE_PATH env var at build time when
 * the site lives under a sub-path (see DEPLOY.md).
 *
 * Unlike `next/link`, which auto-applies `basePath` to internal hrefs,
 * `next/image`'s `src` and other raw "/…" strings are NOT auto-prefixed
 * (confirmed in Next's own basePath docs) — every hardcoded asset path must
 * be run through this at the point it's actually used in an <Image>/URL.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
