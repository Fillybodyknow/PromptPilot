"use client";

import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  durationMs?: number;
}

/** Counts up from 0 to `target` once on mount — used for above-the-fold hero stats. */
export function AnimatedCounter({ target, durationMs = 1200 }: AnimatedCounterProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return <>{value}</>;
}
