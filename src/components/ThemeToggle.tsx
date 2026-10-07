"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
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

  function apply(next: boolean) {
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // localStorage can throw in private-browsing/blocked-storage contexts —
      // the toggle still works for the current page view either way.
    }
    setIsLight(next);
  }

  // ธีมใหม่ขยายเป็นวงกลมออกจากปุ่ม (View Transitions API) ถ้า browser ไม่รองรับหรือผู้ใช้ตั้งลดการเคลื่อนไหวก็สลับทันที
  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const next = !root.classList.contains("light");
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply(next);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-vt");
    const vt = document.startViewTransition(() => flushSync(() => apply(next)));
    vt.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 550, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove("theme-vt"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "สลับเป็นโหมดมืด" : "สลับเป็นโหมดสว่าง"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:bg-chip"
    >
      {/* Rendered blank until mounted (isLight === null) — see note above. */}
      {isLight === null ? null : isLight ? <MoonIcon key="moon" className="pop" /> : <SunIcon key="sun" className="pop" />}
    </button>
  );
}
