"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * โหลดข้อมูลหน้าใหม่ทุก n วินาทีระหว่างที่งานเบื้องหลังยังทำอยู่ (เช่น AI กำลังตรวจ)
 * หยุดทันทีที่ผู้ใช้เริ่มพิมพ์/ติ๊กในฟอร์มใดๆ บนหน้า — ไม่ให้สิ่งที่กรอกค้างไว้หาย แล้วแสดงปุ่มให้กดรีเฟรชเองแทน
 */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const mark = () => setDirty(true);
    document.addEventListener("input", mark);
    document.addEventListener("change", mark);
    return () => {
      document.removeEventListener("input", mark);
      document.removeEventListener("change", mark);
    };
  }, []);
  useEffect(() => {
    if (dirty) return;
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [dirty, router, seconds]);
  if (!dirty) return null;
  return (
    <button type="button" onClick={() => location.reload()} className="ml-2 text-brand underline">
      หยุดรีเฟรชอัตโนมัติเพราะมีการแก้ในฟอร์ม — กดเพื่อโหลดผลล่าสุด
    </button>
  );
}
