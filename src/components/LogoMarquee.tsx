"use client";

import { useEffect, useState } from "react";
import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames } from "@/lib/logos";

const BATCH_SIZE = 8;
const INTERVAL_MS = 4000;
const FADE_MS = 700;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

/** Cycles through batches of vendor logos on a timer via an opacity crossfade —
 * same mechanism as HeroBackgroundSlideshow, deliberately not a sliding/marquee
 * motion (reported as dizzying to look at, replaced once already for a static
 * scroll strip, now made automatic again the same way the hero photos are). */
export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  const batches = chunk(vendors, BATCH_SIZE);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (batches.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % batches.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [batches.length]);

  return (
    <div className="overflow-hidden border-t border-white/10 bg-black/40 py-2.5 light:border-black/10 light:bg-white/60">
      <div className="relative mx-auto h-9 max-w-6xl px-4">
        {batches.map((batch, bi) => (
          <div
            key={bi}
            className="absolute inset-0 flex items-center justify-center gap-3 overflow-x-auto transition-opacity ease-in-out"
            style={{
              opacity: bi === index ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              pointerEvents: bi === index ? "auto" : "none",
            }}
          >
            {batch.map((vendor) => (
              // Real logo colors, kept legible against the dark header via a plain white
              // card — works uniformly regardless of whether the source file is
              // transparent or opaque, and regardless of how dark its text/mark is.
              // In light mode the header background is also near-white, so a ring
              // keeps each chip's edge visible instead of blending in.
              <div
                key={vendor}
                className="flex shrink-0 items-center rounded-lg bg-white px-3 py-1.5 shadow-sm light:ring-1 light:ring-black/10"
              >
                <VendorLogo vendor={vendor} variant="long" size={20} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
