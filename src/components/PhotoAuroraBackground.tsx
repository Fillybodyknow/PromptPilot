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
    </>
  );
}
