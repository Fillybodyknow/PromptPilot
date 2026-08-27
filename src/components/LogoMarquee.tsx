import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames, getVendorLogoInfo } from "@/lib/logos";

export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  // Duplicate the list once so the CSS translateX(-50%) loop is seamless.
  const looped = [...vendors, ...vendors];

  return (
    <div className="group overflow-hidden border-t border-white/10 bg-black/40 py-2.5">
      <div className="flex w-max animate-marquee items-center gap-8 px-4">
        {looped.map((vendor, i) => {
          const isOpaque = getVendorLogoInfo(vendor).longOpaque;
          return (
            <div key={`${vendor}-${i}`} className="flex shrink-0 items-center">
              {isOpaque ? (
                // Fully opaque logo (no transparency) — a monochrome/invert filter would
                // turn the whole rectangle into a solid white block, so give it a light
                // chip instead and keep its real colors.
                <div className="flex items-center rounded bg-white px-2 py-1 opacity-70 transition-opacity hover:opacity-100">
                  <VendorLogo vendor={vendor} variant="long" size={18} />
                </div>
              ) : (
                <div className="opacity-50 grayscale invert brightness-0 transition-all duration-300 hover:opacity-100 hover:filter-none">
                  <VendorLogo vendor={vendor} variant="long" size={22} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
