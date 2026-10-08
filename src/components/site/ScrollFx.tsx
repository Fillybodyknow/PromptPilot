"use client";

import { useEffect } from "react";

/** เลื่อนพ้น hero แล้วค่อยเริ่มซ่อน header (ด้านบนของหน้า header ต้องเห็นเสมอ) */
const HIDE_AFTER_PX = 480;
/** ขยับน้อยกว่านี้ไม่นับว่าเปลี่ยนทิศ กัน header กระพริบตอนนิ้วสั่นบน touchpad */
const MIN_DELTA_PX = 6;

/**
 * บอกทิศทางการเลื่อนหน้าผ่าน <html data-scroll-dir="up|down"> ให้ CSS ใช้ (ดู globals.css):
 * เลื่อนลง = ซ่อน header ให้เห็นเนื้อหาเต็มจอ, เลื่อนขึ้น = header และปุ่มกลับขึ้นบนโผล่มา
 * ไม่ทำอะไรถ้าผู้ใช้ตั้งลดการเคลื่อนไหว
 */
export function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - last;
      if (Math.abs(delta) < MIN_DELTA_PX) return;
      root.dataset.scrollDir = delta > 0 && y > HIDE_AFTER_PX ? "down" : "up";
      last = y;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      delete root.dataset.scrollDir;
    };
  }, []);
  return null;
}
