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

export function PartnersSection() {
  return (
    <section className="mb-14 sm:mb-20">
      <h2 className="mb-6 text-center text-sm font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-500">
        พันธมิตรของเรา
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {PARTNERS.map((partner) => (
          <div
            key={partner.name}
            className="flex h-20 w-40 items-center justify-center rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800"
          >
            <Image
              src={partner.src}
              alt={partner.name}
              title={partner.name}
              width={128}
              height={64}
              className="max-h-full w-auto object-contain"
              unoptimized
            />
          </div>
        ))}
      </div>
    </section>
  );
}
