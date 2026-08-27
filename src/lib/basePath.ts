/**
 * Prefix for static asset paths under `public/`. Empty in local dev; set to
 * "/PromptPilot" on GitHub Pages via the NEXT_PUBLIC_BASE_PATH env var (see
 * .github/workflows/deploy.yml), since Pages serves a project repo from a
 * `/<repo>` sub-path rather than the domain root.
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
