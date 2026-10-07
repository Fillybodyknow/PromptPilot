"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VendorLogo } from "@/components/VendorLogo";

const TARGET_BATCH_SIZE = 7;
const INTERVAL_MS = 4000;
const FADE_MS = 700;
const GAP_PX = 10; // ต้องตรงกับ gap-2.5 ของแถวด้านล่าง

// วัดความกว้างก่อน browser วาด จะได้ไม่เห็นโลโก้ล้นแล้วค่อยหด (บน server ไม่มี DOM ให้วัด)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** แบ่งเป็นชุดที่ขนาดต่างกันไม่เกิน 1 กันชุดสุดท้ายเหลือโลโก้ตัวเดียว */
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

const chip = "flex h-12 shrink-0 items-center rounded-xl bg-white px-4 shadow-sm ring-1 ring-black/5";

/**
 * แถบโลโก้ผู้ให้บริการบนหน้าแรก สลับทีละชุดแบบจางเข้าออก (ไม่เลื่อนแนวนอน เพราะเคยมีคนบอกว่าเวียนหัว)
 * แต่ละชุดวัดความกว้างจริงแล้วตัดให้เหลือเท่าที่พอดี จึงไม่มีโลโก้ขาดครึ่ง
 * หยุดสลับเมื่อชี้เมาส์หรือ focus อยู่ และไม่สลับเลยถ้าผู้ใช้ตั้งลดการเคลื่อนไหว
 */
export function VendorStrip({ vendors }: { vendors: string[] }) {
  const batches = chunkEvenly(vendors, TARGET_BATCH_SIZE);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visibleCounts, setVisibleCounts] = useState<number[]>(() => batches.map((b) => b.length));
  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (batches.length <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % batches.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [batches.length, paused]);

  // วัดจากสำเนาที่มองไม่เห็นของชุดเต็ม ขยายจอกลับมาแล้วโลโก้ที่เคยถูกตัดจะกลับมาได้
  useIsomorphicLayoutEffect(() => {
    function measure() {
      setVisibleCounts(
        batches.map((batch, bi) => {
          const row = measureRefs.current[bi];
          if (!row) return batch.length;
          const available = row.clientWidth;
          let used = 0;
          let count = 0;
          for (const el of Array.from(row.children) as HTMLElement[]) {
            const w = el.offsetWidth + (count > 0 ? GAP_PX : 0);
            if (count > 0 && used + w > available) break;
            used += w;
            count++;
          }
          return Math.max(count, 1);
        }),
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [batches.length]);

  return (
    <div
      className="relative h-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {batches.map((batch, bi) => (
        <div
          key={bi}
          inert={bi !== index}
          className="absolute inset-0 flex items-center justify-center gap-2.5 overflow-hidden transition-opacity ease-in-out"
          style={{ opacity: bi === index ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        >
          {batch.slice(0, visibleCounts[bi] ?? batch.length).map((vendor) => (
            <Link
              key={vendor}
              href={`/tools?q=${encodeURIComponent(vendor)}`}
              aria-label={`เครื่องมือของ ${vendor}`}
              className={`${chip} transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <VendorLogo vendor={vendor} variant="long" size={28} heightClassName="h-6 sm:h-7" />
            </Link>
          ))}
        </div>
      ))}

      {/* แถวที่มองไม่เห็นไว้วัดความกว้างจริงของแต่ละชุด (visibility:hidden ยังจัด layout แต่ไม่วาดและ focus ไม่ได้) */}
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
            <span key={vendor} className={chip}>
              <VendorLogo vendor={vendor} variant="long" size={28} heightClassName="h-6 sm:h-7" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
