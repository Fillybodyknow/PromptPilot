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
 * Compact partner-logo strip for the Header — kept as its own row, separate
 * from the app logo (per request). Each logo sits on a small white chip
 * since some files are transparent PNGs with dark-colored marks that would
 * disappear directly against the header's dark-mode background.
 */
export function PartnersSection() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-950/60">
      <span className="mr-1 text-xs font-medium whitespace-nowrap text-neutral-400 dark:text-neutral-600">
        พันธมิตรของเรา
      </span>
      {PARTNERS.map((partner) => (
        <div
          key={partner.name}
          className="flex h-7 shrink-0 items-center justify-center rounded bg-white px-2 py-1 shadow-sm"
        >
          <Image
            src={partner.src}
            alt={partner.name}
            title={partner.name}
            width={72}
            height={24}
            className="h-5 w-auto object-contain"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
