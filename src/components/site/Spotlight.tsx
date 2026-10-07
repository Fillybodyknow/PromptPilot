"use client";

import { useEffect } from "react";

const MAX_TILT = 6; // องศา

/**
 * ลูกเล่นตามเมาส์ทั้งหน้า ใช้ listener ตัวเดียว (event delegation):
 * - การ์ด "spotlight": ตั้ง --mx/--my ให้แสงเรืองตามเมาส์
 * - การ์ด "tilt": ตั้ง --rx/--ry ให้การ์ดเอียงเข้าหาเมาส์ และคืนค่าเมื่อเมาส์ออก
 * ส่วนการวาดทั้งหมดอยู่ใน globals.css
 */
export function Spotlight() {
  useEffect(() => {
    let tilted: HTMLElement | null = null;
    const reset = () => {
      tilted?.style.removeProperty("--rx");
      tilted?.style.removeProperty("--ry");
      tilted = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = e.target as Element | null;
      const glow = target?.closest<HTMLElement>(".spotlight");
      if (glow) {
        const r = glow.getBoundingClientRect();
        glow.style.setProperty("--mx", `${e.clientX - r.left}px`);
        glow.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const tilt = target?.closest<HTMLElement>(".tilt") ?? null;
      if (tilt !== tilted) reset();
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--rx", `${(-py * MAX_TILT * 2).toFixed(2)}deg`);
        tilt.style.setProperty("--ry", `${(px * MAX_TILT * 2).toFixed(2)}deg`);
        tilted = tilt;
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", reset);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", reset);
    };
  }, []);
  return null;
}
