"use client";

import { useState } from "react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const btn = "flex h-10 items-center rounded-lg border border-line bg-surface px-3.5 text-sm hover:border-ink";

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard ถูกบล็อก (เช่น ไม่ใช่ https) — ผู้ใช้ยังคัดลอกจากแถบที่อยู่ได้
    }
  }

  function line() {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(title)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-chip px-5 py-4">
      <span className="text-sm font-semibold">แชร์ให้ทีม</span>
      <span className="flex gap-2">
        <button type="button" onClick={copy} className={btn} aria-live="polite">
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
        <button type="button" onClick={line} className={btn}>
          LINE
        </button>
      </span>
    </div>
  );
}
