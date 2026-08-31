import Image from "next/image";
import { withBasePath } from "@/lib/basePath";

interface Partner {
  name: string;
  src: string;
}

const PARTNERS: Partner[] = [
  { name: "DSCM — Digital Supply Chain Management", src: "/images/app/company/1_dscm.jpg" },
  { name: "Albatross Logistics", src: "/images/app/company/2_P-Albatross-Logistics.png" },
  { name: "TTV Supplychain Co., Ltd.", src: "/images/app/company/3_NEW_TTV_PNG.png" },
  {
    name: "กล่องดวงใจ เมนูแฟคเจอริ่ง (Glongduangjai Manufacturing Co., Ltd.)",
    src: "/images/app/company/4_gdjm.png",
  },
  { name: "Total Quality Services Co., Ltd.", src: "/images/app/company/5_TQS_PNG.png" },
];

/**
 * Compact inline partner-logo chips — sits in the same row as the app logo in
 * Header, to its left, separated by a divider. Small white chips (fixed
 * height, auto width) keep each logo's real colors legible and undistorted
 * regardless of its own aspect ratio or background transparency.
 *
 * Sized so all 5 fit on one line on a phone without scrolling — at the real
 * aspect ratios of these 5 files (2.5, 1.0, 2.2, 1.0, 1.44), a 20px logo
 * height needs ~163px total, which fits a 360px-wide header with the tighter
 * mobile padding/gaps used here (checked by hand, not just eyeballed).
 * overflow-x-auto stays only as a safety net for anything narrower.
 */
export function PartnersSection() {
  return (
    <div
      className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1"
      aria-label="พันธมิตรของเรา"
    >
      {PARTNERS.map((partner) => (
        <div
          key={partner.name}
          className="flex h-6 shrink-0 items-center rounded bg-white px-1 py-0.5 sm:h-8 sm:px-1.5 sm:py-1 lg:h-9 light:ring-1 light:ring-black/10"
        >
          <Image
            src={withBasePath(partner.src)}
            alt={partner.name}
            title={partner.name}
            width={72}
            height={22}
            className="h-5 w-auto object-contain sm:h-6 lg:h-7"
            style={{ width: "auto" }}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
