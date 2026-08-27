"use client";

import { useState } from "react";

export function ThemeToggle() {
  // Lazy initializer reads the real DOM state on the client (after the no-flash
  // script in layout.tsx has already set .dark) — null only during SSR, where
  // `document` doesn't exist yet, so no effect/extra render is needed to sync it.
  const [isDark, setIsDark] = useState<boolean | null>(() =>
    typeof document === "undefined"
      ? null
      : document.documentElement.classList.contains("dark")
  );

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private mode etc.) — theme just won't persist
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="สลับธีมสว่าง/มืด"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900"
    >
      {isDark === null ? null : isDark ? "☀️" : "🌙"}
    </button>
  );
}
