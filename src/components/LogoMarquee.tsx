import { VendorLogo } from "./VendorLogo";
import { getAllVendorDisplayNames } from "@/lib/logos";

export function LogoMarquee() {
  const vendors = getAllVendorDisplayNames();
  // Duplicate the list once so the CSS translateX(-50%) loop is seamless.
  const looped = [...vendors, ...vendors];

  return (
    <div className="group overflow-hidden border-t border-neutral-200 bg-neutral-50 py-2 dark:border-neutral-800 dark:bg-neutral-950/60">
      <div className="flex w-max animate-marquee gap-6 px-4">
        {looped.map((vendor, i) => (
          <div
            key={`${vendor}-${i}`}
            className="flex shrink-0 items-center gap-2 opacity-70 transition-opacity hover:opacity-100"
          >
            <VendorLogo vendor={vendor} size={20} />
            <span className="whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
              {vendor}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
