import Image from "next/image";
import type { ReactNode } from "react";
import type { Visual } from "@/lib/visuals";

/**
 * หัวหน้าเพจแบบมีรูป — overlay สีเข้มเสมอทั้งสองธีม ข้อความจึงเป็นสีขาวและอ่านออกเสมอ
 * size: "lg" = hero หน้าแรก, "md" = หัวหน้ารายการ/คู่มือ, "sm" = แถบบางเหนือหน้ารายละเอียด
 */
export function PageBanner({
  visual,
  size = "md",
  priority = true,
  children,
}: {
  visual: Visual;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  children?: ReactNode;
}) {
  const height = { sm: "min-h-[180px]", md: "min-h-[260px] sm:min-h-[300px]", lg: "min-h-[440px] sm:min-h-[500px]" }[size];
  return (
    <section className={`relative isolate overflow-hidden bg-[#0c0d11] ${height}`}>
      <Image
        src={visual.src}
        alt={visual.alt}
        fill
        priority={priority}
        placeholder="blur"
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      {/* ไล่เข้มจากซ้าย (ฝั่งข้อความ) และจากล่าง ให้ข้อความขาวผ่าน contrast บนทุกส่วนของรูป */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0c0d11]/95 via-[#0c0d11]/75 to-[#0c0d11]/25" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c0d11]/80 via-transparent to-transparent" />
      <div className={`relative mx-auto flex max-w-6xl flex-col justify-end px-4 pb-8 pt-10 text-white sm:px-6 ${height}`}>{children}</div>
    </section>
  );
}

/** ไล่สีแบรนด์บนพื้นเข้ม (ใช้ใน banner) */
export const brandGradientText = "bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent";
