import Image from "next/image";
import { getVendorLogoInfo, getBadgeColor } from "@/lib/logos";
import { withBasePath } from "@/lib/basePath";

interface VendorLogoProps {
  vendor: string;
  /** "square" = icon mark in a fixed-size box (default). "long" = wide wordmark, fixed height / auto width. */
  variant?: "square" | "long";
  size?: number;
  className?: string;
  /** "long" variant only — responsive Tailwind height classes (e.g. "h-5 sm:h-6 lg:h-7")
   * that replace the fixed `size`-driven inline height, so the logo can scale per
   * breakpoint the same way a plain <Image> with a className would. `size` still sets
   * the intrinsic height/width props Next uses for the image's aspect ratio. */
  heightClassName?: string;
}

/**
 * Renders a vendor's real logo (from src/lib/logos.ts's verified registry) if
 * one exists, otherwise a deterministic colored initials badge as a placeholder
 * (only for the square variant — the long wordmark has no sensible badge
 * equivalent, so it just renders nothing if missing).
 */
export function VendorLogo({
  vendor,
  variant = "square",
  size = 28,
  className = "",
  heightClassName,
}: VendorLogoProps) {
  const info = getVendorLogoInfo(vendor);

  if (variant === "long") {
    if (!info.longSrc) return null;
    return (
      <Image
        src={withBasePath(info.longSrc)}
        alt={vendor}
        title={vendor}
        width={160}
        height={size}
        className={`w-auto shrink-0 object-contain ${heightClassName ?? ""} ${className}`}
        style={heightClassName ? { width: "auto" } : { height: size, width: "auto" }}
        unoptimized
      />
    );
  }

  if (info.src) {
    return (
      <Image
        src={withBasePath(info.src)}
        alt={vendor}
        title={vendor}
        width={size}
        height={size}
        className={`shrink-0 rounded object-contain ${className}`}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  return (
    <div
      title={vendor}
      aria-label={vendor}
      className={`flex shrink-0 items-center justify-center rounded-md font-semibold text-white ${getBadgeColor(vendor)} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.34) }}
    >
      {info.initials}
    </div>
  );
}
