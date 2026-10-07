"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./site/icons";

/**
 * Toggles a `.light` class on <html>, persisted to localStorage. Until the
 * user picks, the no-flash script in layout.tsx follows the OS preference.
 */
export function ThemeToggle() {
  const [isLight, setIsLight] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading the class the no-flash script already applied requires the DOM,
    // so this can only happen post-mount — the null initial render (below)
    // keeps server and client markup identical to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // localStorage can throw in private-browsing/blocked-storage contexts —
      // the toggle still works for the current page view either way.
    }
    setIsLight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "สลับเป็นโหมดมืด" : "สลับเป็นโหมดสว่าง"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:bg-chip"
    >
      {/* Rendered blank until mounted (isLight === null) — see note above. */}
      {isLight === null ? null : isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
