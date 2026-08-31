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
 * regardless of its own aspect ratio or background transparency. Visible at
 * every width (previously hidden below `lg`) — scrolls internally on very
 * narrow screens instead of overflowing the header row.
 */
export function PartnersSection() {
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
      aria-label="พันธมิตรของเรา"
    >
      {PARTNERS.map((partner) => (
        <div
          key={partner.name}
          className="flex h-7 shrink-0 items-center rounded bg-white px-1.5 py-1 sm:h-8 lg:h-9 light:ring-1 light:ring-black/10"
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
