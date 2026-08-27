import { HeroBackgroundSlideshow } from "./HeroBackgroundSlideshow";
import { AuroraBackground } from "./AuroraBackground";

interface PhotoAuroraBackgroundProps {
  objectPositionClassName?: string;
}

/** Photo slideshow behind a dark scrim, with the drifting aurora gradient blobs glowing on top. */
export function PhotoAuroraBackground({ objectPositionClassName }: PhotoAuroraBackgroundProps) {
  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <HeroBackgroundSlideshow objectPositionClassName={objectPositionClassName} />
        <div className="absolute inset-0 bg-black/75" />
      </div>
      <AuroraBackground />
      {/* Soften the hard cut where the photo section meets the page — fades into
          the page's background color (theme-aware) instead of a flat edge.
          Sits above the photo/aurora (which are on negative z-index) but below
          the section's actual text content, painted later in DOM order. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent sm:h-32" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent sm:h-32" />
    </>
  );
}
