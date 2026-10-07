"use client";

import { useState } from "react";

export function CopyButton({ text, label = "คัดลอก prompt" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-live="polite"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard ถูกบล็อก — ผู้ใช้ยังเลือกข้อความเองได้
        }
      }}
      className="flex h-9 shrink-0 items-center rounded-lg border border-line bg-surface px-3 text-[13px] text-ink hover:border-ink"
    >
      {copied ? "คัดลอกแล้ว" : label}
    </button>
  );
}
