"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames } from "@/lib/logos";

const TARGET_BATCH_SIZE = 7;
const INTERVAL_MS = 4000;
const FADE_MS = 700;
const GAP_PX = 10; // must match the gap-2.5 utility used on the rows below

// useLayoutEffect runs synchronously before the browser paints (useEffect runs
// after) — needed here so the trim happens before anything is shown, not as a
// visible flash of overflow that then snaps in. No-ops on the server (there's
// no DOM to measure yet), which is what avoids the "does nothing on the
// server" warning React gives if useLayoutEffect itself runs during SSR.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

function Chip({ vendor }: { vendor: string }) {
  return (
    <div className="flex shrink-0 items-center rounded-lg bg-white px-3 py-2 shadow-sm light:ring-1 light:ring-black/10">
      <VendorLogo vendor={vendor} variant="long" size={24} />
    </div>
  );
}

/** Cycles through batches of vendor logos on a timer via an opacity crossfade —
 * same mechanism as HeroBackgroundSlideshow, deliberately not a sliding/marquee
 * motion (reported as dizzying, replaced once for a static scroll strip, made
 * automatic again the same way the hero photos are).
 *
 * Real wordmark logos vary a lot in width (n8n vs. Black Forest Labs), so a
 * fixed per-viewport count either cuts a logo in half or leaves too much
 * empty space depending which vendors land in a given batch. Instead this
 * measures each batch's chips at their real rendered width and slices to
 * however many whole ones fit — never a partial logo, no scroll, stays
 * centered because there's nothing left over to clip. */
export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  const batches = chunkEvenly(vendors, TARGET_BATCH_SIZE);
  const [index, setIndex] = useState(0);
  const [visibleCounts, setVisibleCounts] = useState<number[]>(() =>
    batches.map((b) => b.length)
  );
  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (batches.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % batches.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [batches.length]);

  // Measured against a permanently-mounted, invisible copy of each full batch
  // (not the trimmed visible one) so widening the viewport back out can
  // restore logos that a narrower measurement had trimmed away — the source
  // of truth never loses data the way slicing the visible row would.
  useIsomorphicLayoutEffect(() => {
    function measure() {
      setVisibleCounts(
        batches.map((batch, bi) => {
          const row = measureRefs.current[bi];
          if (!row) return batch.length;
          const available = row.clientWidth;
          const chips = Array.from(row.children) as HTMLElement[];
          let used = 0;
          let count = 0;
          for (const chip of chips) {
            const w = chip.offsetWidth + (count > 0 ? GAP_PX : 0);
            if (count > 0 && used + w > available) break;
            used += w;
            count++;
          }
          return Math.max(count, 1);
        })
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [batches.length]);

  return (
    <div className="overflow-hidden border-t border-white/10 bg-black/40 py-2 light:border-black/10 light:bg-white/60">
      <div className="relative mx-auto h-11 max-w-6xl px-4">
        {batches.map((batch, bi) => (
          <div
            key={bi}
            className="absolute inset-0 flex items-center justify-center gap-2.5 overflow-hidden transition-opacity ease-in-out"
            style={{
              opacity: bi === index ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              pointerEvents: bi === index ? "auto" : "none",
            }}
          >
            {batch.slice(0, visibleCounts[bi] ?? batch.length).map((vendor) => (
              <Chip key={vendor} vendor={vendor} />
            ))}
          </div>
        ))}

        {/* Invisible full-batch rows, purely for measuring real chip widths — see
            the layout effect above. visibility:hidden (not display:none) so they
            still lay out and have real offsetWidth, but never paint or affect
            other elements since they're absolutely positioned out of flow. */}
        {batches.map((batch, bi) => (
          <div
            key={`measure-${bi}`}
            ref={(el) => {
              measureRefs.current[bi] = el;
            }}
            className="invisible absolute inset-0 flex items-center gap-2.5"
            aria-hidden
          >
            {batch.map((vendor) => (
              <Chip key={vendor} vendor={vendor} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
