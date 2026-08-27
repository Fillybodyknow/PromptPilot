"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const BACKGROUNDS = Array.from(
  { length: 8 },
  (_, i) => `/images/app/backgrounds/${i + 1}.png`
);

const INTERVAL_MS = 6000;
const FADE_MS = 1500;

interface HeroBackgroundSlideshowProps {
  /** Tailwind object-position class for the crop. Defaults to "object-top" (keeps heads
   * in frame on short banners). Pass e.g. "object-[center_30%]" to bias toward center instead. */
  objectPositionClassName?: string;
}

/** Cross-fades through all 8 hero background photos on a timer. */
export function HeroBackgroundSlideshow({
  objectPositionClassName = "object-top",
}: HeroBackgroundSlideshowProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % BACKGROUNDS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {BACKGROUNDS.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          unoptimized
          priority={i === 0}
          className={`object-cover ${objectPositionClassName} brightness-110 transition-opacity ease-in-out`}
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}
    </>
  );
}
