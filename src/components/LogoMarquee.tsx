import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames } from "@/lib/logos";

export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  // Duplicate the list once so the CSS translateX(-50%) loop is seamless.
  const looped = [...vendors, ...vendors];

  return (
    <div className="group overflow-hidden border-t border-white/10 bg-black/40 py-2.5">
      <div className="flex w-max animate-marquee items-center gap-8 px-4">
        {looped.map((vendor, i) => (
          <div
            key={`${vendor}-${i}`}
            className="flex shrink-0 items-center opacity-60 transition-opacity hover:opacity-100"
          >
            <VendorLogo vendor={vendor} variant="long" size={22} />
          </div>
        ))}
      </div>
    </div>
  );
}
