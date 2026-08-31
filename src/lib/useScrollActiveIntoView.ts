import { useEffect, useRef } from "react";

/**
 * Horizontally centers the active item within its immediate scroll container
 * whenever `activeKey` changes (a selection, or navigating directly to a
 * category by URL) — used by the mobile chip strips (category selection,
 * tool selection) so the picked item is always visible without the user
 * having to scroll themselves.
 *
 * Deliberately NOT the browser's built-in `Element.scrollIntoView()` — it
 * walks up every scrollable ancestor, not just the immediate one, and even
 * with `block: "nearest"` that still ended up scrolling the whole page
 * vertically in practice (observed on the actual category strip, not just a
 * theoretical risk). Scrolling the container directly via its own
 * `scrollTo()` cannot cascade to any ancestor — there is no vertical
 * component to this at all, so nothing outside the strip can move.
 */
export function useScrollActiveIntoView<T extends HTMLElement>(activeKey: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;
    const targetScrollLeft = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [activeKey]);
  return ref;
}
