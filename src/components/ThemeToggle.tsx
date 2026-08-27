"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  // Must start as null on BOTH server and the client's first (hydration) render —
  // `document` doesn't exist during SSR, so the server always renders nothing here.
  // Reading the real DOM state via a lazy useState initializer instead of this effect
  // would make the client's first render diverge from that (it'd see .dark already set
  // by the no-flash script and render immediately), causing a hydration mismatch.
  // Syncing from an external system (the DOM class set outside React, before hydration)
  // is exactly the case React's docs carve out as a legitimate use of an effect.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Post-mount sync with DOM state (see comment above) — no way to read this
    // without a hydration mismatch, so this is a deliberate exception.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

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
