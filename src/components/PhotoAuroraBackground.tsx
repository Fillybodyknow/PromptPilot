import { HeroBackgroundSlideshow } from "./HeroBackgroundSlideshow";
import { AuroraBackground } from "./AuroraBackground";

/** Photo slideshow behind a dark scrim, with the drifting aurora gradient blobs glowing on top. */
export function PhotoAuroraBackground() {
  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <HeroBackgroundSlideshow />
        <div className="absolute inset-0 bg-black/75" />
      </div>
      <AuroraBackground />
    </>
  );
}
