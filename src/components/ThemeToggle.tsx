"use client";

import { useEffect, useState } from "react";

/**
 * Toggles a `.light` class on <html>, persisted to localStorage. Default (no
 * stored preference) stays dark — see the no-flash script in layout.tsx that
 * applies the same class before hydration so there's no flash on load.
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white light:text-neutral-500 light:hover:bg-black/5 light:hover:text-neutral-900"
    >
      {/* Rendered blank until mounted (isLight === null) — see note above. */}
      {isLight === null ? null : isLight ? "🌙" : "☀️"}
    </button>
  );
}
