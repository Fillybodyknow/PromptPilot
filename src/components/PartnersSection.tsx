import Image from "next/image";

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
 * regardless of its own aspect ratio or background transparency. Hidden below
 * `lg` since the header row has no space for it at narrower widths.
 */
export function PartnersSection() {
  return (
    <div className="hidden items-center gap-1.5 lg:flex" aria-label="พันธมิตรของเรา">
      {PARTNERS.map((partner) => (
        <div
          key={partner.name}
          className="flex h-6 shrink-0 items-center rounded bg-white px-1.5 py-1 light:ring-1 light:ring-black/10"
        >
          <Image
            src={partner.src}
            alt={partner.name}
            title={partner.name}
            width={56}
            height={16}
            className="h-4 w-auto object-contain"
            style={{ width: "auto" }}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
