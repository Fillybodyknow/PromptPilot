import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames } from "@/lib/logos";

export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  // Duplicate the list once so the CSS translateX(-50%) loop is seamless.
  const looped = [...vendors, ...vendors];

  return (
    <div className="group overflow-hidden border-t border-white/10 bg-black/40 py-2.5 light:border-black/10 light:bg-white/60">
      <div className="flex w-max animate-marquee items-center gap-3 px-4">
        {looped.map((vendor, i) => (
          // Real logo colors, kept legible against the dark header via a plain white
          // card — works uniformly regardless of whether the source file is
          // transparent or opaque, and regardless of how dark its text/mark is.
          // In light mode the header background is also near-white, so a ring
          // keeps each chip's edge visible instead of blending in.
          <div
            key={`${vendor}-${i}`}
            className="flex shrink-0 items-center rounded-lg bg-white px-3 py-1.5 shadow-sm transition-transform hover:scale-105 light:ring-1 light:ring-black/10"
          >
            <VendorLogo vendor={vendor} variant="long" size={20} />
          </div>
        ))}
      </div>
    </div>
  );
}
