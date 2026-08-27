"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const BACKGROUNDS = Array.from(
  { length: 8 },
  (_, i) => `/images/app/backgrounds/${i + 1}.png`
);

const INTERVAL_MS = 6000;
const FADE_MS = 1500;

/** Cross-fades through all 8 hero background photos on a timer. */
export function HeroBackgroundSlideshow() {
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
          className="object-cover brightness-110 transition-opacity ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}
    </>
  );
}
