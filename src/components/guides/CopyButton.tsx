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
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors active:scale-95 ${
        copied ? "pop border-emerald-500/50 bg-good-bg text-good" : "border-line bg-surface text-ink hover:border-ink"
      }`}
    >
      {copied ? (
        <>
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          คัดลอกแล้ว
        </>
      ) : (
        label
      )}
    </button>
  );
}
