"use client";

import { useEffect } from "react";

/**
 * แสงตามเมาส์บนการ์ดที่มี class "spotlight" — ใช้ listener ตัวเดียวทั้งหน้า (event delegation)
 * แค่ตั้ง --mx/--my ให้การ์ดใต้เมาส์ ส่วนการวาดอยู่ใน globals.css
 */
export function Spotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
