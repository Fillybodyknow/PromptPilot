import { HeroBackgroundSlideshow } from "./HeroBackgroundSlideshow";
import { AuroraBackground } from "./AuroraBackground";

interface PhotoAuroraBackgroundProps {
  objectPositionClassName?: string;
  /** Height classes for the top edge fade. Defaults to a full-size fade —
   * pass a smaller one for a section that sits close to the Footer. */
  topFadeHeightClassName?: string;
  /** Height classes for the bottom edge fade. Defaults to the same size as the
   * top fade — pass a smaller one for a section that sits right above the
   * Footer, where a full-size fade reads as too much. */
  bottomFadeHeightClassName?: string;
}

/** Photo slideshow behind a dark scrim, with the drifting aurora gradient blobs glowing on top. */
export function PhotoAuroraBackground({
  objectPositionClassName,
  topFadeHeightClassName = "h-20 sm:h-32",
  bottomFadeHeightClassName = "h-20 sm:h-32",
}: PhotoAuroraBackgroundProps) {
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
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-background to-transparent ${topFadeHeightClassName}`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent ${bottomFadeHeightClassName}`}
      />
    </>
  );
}
