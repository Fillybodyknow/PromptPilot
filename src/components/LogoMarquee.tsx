"use client";

import { useEffect, useState } from "react";
import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames } from "@/lib/logos";

const TARGET_BATCH_SIZE = 7;
const INTERVAL_MS = 4000;
const FADE_MS = 700;

/** Splits into as-even-as-possible batches (sizes differ by at most 1) around
 * `targetSize`, instead of fixed-size chunks — a plain fixed-size chunk leaves
 * a small/lonely remainder batch whenever the total isn't a clean multiple
 * (41 vendors ÷ 8 left a batch of just 1, which read as a mistake on screen). */
function chunkEvenly<T>(items: T[], targetSize: number): T[][] {
  if (items.length === 0) return [];
  const batchCount = Math.max(1, Math.round(items.length / targetSize));
  const base = Math.floor(items.length / batchCount);
  const remainder = items.length % batchCount;
  const batches: T[][] = [];
  let offset = 0;
  for (let b = 0; b < batchCount; b++) {
    const size = base + (b < remainder ? 1 : 0);
    batches.push(items.slice(offset, offset + size));
    offset += size;
  }
  return batches;
}

/** Cycles through batches of vendor logos on a timer via an opacity crossfade —
 * same mechanism as HeroBackgroundSlideshow, deliberately not a sliding/marquee
 * motion (reported as dizzying to look at, replaced once already for a static
 * scroll strip, now made automatic again the same way the hero photos are). */
export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  const batches = chunkEvenly(vendors, TARGET_BATCH_SIZE);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (batches.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % batches.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [batches.length]);

  return (
    <div className="overflow-hidden border-t border-white/10 bg-black/40 py-2 light:border-black/10 light:bg-white/60">
      <div className="relative mx-auto h-11 max-w-6xl px-4">
        {batches.map((batch, bi) => (
          <div
            key={bi}
            className="absolute inset-0 flex items-center justify-center gap-2.5 overflow-x-auto transition-opacity ease-in-out"
            style={{
              opacity: bi === index ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              pointerEvents: bi === index ? "auto" : "none",
            }}
          >
            {batch.map((vendor, vi) => (
              // Real logo colors, kept legible against the dark header via a plain white
              // card — works uniformly regardless of whether the source file is
              // transparent or opaque, and regardless of how dark its text/mark is.
              // In light mode the header background is also near-white, so a ring
              // keeps each chip's edge visible instead of blending in. Only the
              // first 4 of each batch show on mobile — a full 7 logos plus the now-
              // larger partner strip above doesn't fit a narrow header comfortably.
              <div
                key={vendor}
                className={`shrink-0 items-center rounded-lg bg-white px-3 py-2 shadow-sm light:ring-1 light:ring-black/10 ${
                  vi >= 4 ? "hidden sm:flex" : "flex"
                }`}
              >
                <VendorLogo vendor={vendor} variant="long" size={24} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
