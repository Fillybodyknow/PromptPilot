import Image from "next/image";
import { withBasePath } from "@/lib/basePath";

interface Partner {
  name: string;
  src: string;
  /** ไอคอน SVG ทรงสี่เหลี่ยมมุมมนที่มีพื้นหลังในตัว — แสดงตรงๆ ไม่ต้องมีกรอบขาว */
  icon?: boolean;
}

const SVG = "/images/app/company/svg/logos";

const PARTNERS: Partner[] = [
  // DSCM ยังไม่มีไฟล์ SVG — ใช้รูปเดิมในกรอบขาว
  { name: "DSCM — Digital Supply Chain Management", src: "/images/app/company/1_dscm.jpg" },
  { name: "Albatross Logistics", src: `${SVG}/ABT_icon.svg`, icon: true },
  { name: "TTV Supplychain Co., Ltd.", src: `${SVG}/TTV_Icon.svg`, icon: true },
  { name: "กล่องดวงใจ เมนูแฟคเจอริ่ง (Glongduangjai Manufacturing Co., Ltd.)", src: `${SVG}/GDJ_icon.svg`, icon: true },
  { name: "Total Quality Services Co., Ltd.", src: `${SVG}/TQS_Icon.svg`, icon: true },
];

/**
 * โลโก้บริษัทในเครือ แถวเดียวกับโลโก้แอปใน header (และฝั่งภาพของหน้า login)
 * ไอคอน SVG แสดงเป็นสี่เหลี่ยมจัตุรัสสูงเท่ากรอบของ DSCM ทุกขนาดจอ — 5 ตัวรวมกันราว 160px บนมือถือ
 * จึงพอดีหัวเว็บกว้าง 360px โดยไม่ต้องเลื่อน (overflow-x-auto เหลือไว้กันจอที่แคบกว่านั้น)
 */
export function PartnersSection() {
  return (
    <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1" aria-label="บริษัทในเครือ">
      {PARTNERS.map((partner) =>
        partner.icon ? (
          <Image
            key={partner.name}
            src={withBasePath(partner.src)}
            alt={partner.name}
            title={partner.name}
            width={36}
            height={36}
            className="h-6 w-6 shrink-0 rounded-[22%] sm:h-8 sm:w-8 lg:h-9 lg:w-9 light:ring-1 light:ring-black/10"
            unoptimized
          />
        ) : (
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
        ),
      )}
    </div>
  );
}
