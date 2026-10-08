"use client";

import { useEffect } from "react";

const MAX_TILT = 6; // องศา

/**
 * การ์ด "tilt" เอียงเข้าหาเมาส์ — ใช้ listener ตัวเดียวทั้งหน้า (event delegation)
 * แค่ตั้ง --rx/--ry ให้การ์ดใต้เมาส์ และคืนค่าเมื่อเมาส์ออก ส่วนการวาดอยู่ใน .tilt ของ globals.css
 */
export function PointerTilt() {
  useEffect(() => {
    let tilted: HTMLElement | null = null;
    const reset = () => {
      tilted?.style.removeProperty("--rx");
      tilted?.style.removeProperty("--ry");
      tilted = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const tilt = (e.target as Element | null)?.closest<HTMLElement>(".tilt") ?? null;
      if (tilt !== tilted) reset();
      if (!tilt) return;
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty("--rx", `${(-py * MAX_TILT * 2).toFixed(2)}deg`);
      tilt.style.setProperty("--ry", `${(px * MAX_TILT * 2).toFixed(2)}deg`);
      tilted = tilt;
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
