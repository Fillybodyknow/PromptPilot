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
      {/* hero หน้าแรก (lg): รูปเลื่อนช้ากว่าหน้า (parallax) — ห่อด้วย div เพราะตัวรูปใช้ transform กับ ken-burns อยู่แล้ว */}
      <div className={`absolute inset-0 -z-20 ${size === "lg" ? "hero-par-bg" : ""}`}>
        <Image src={visual.src} alt={visual.alt} fill priority={priority} placeholder="blur" sizes="100vw" className="ken-burns object-cover object-center" />
      </div>
      {/* ไล่เข้มจากซ้าย (ฝั่งข้อความ) และจากล่าง ให้ข้อความขาวผ่าน contrast บนทุกส่วนของรูป */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0c0d11]/95 via-[#0c0d11]/75 to-[#0c0d11]/25" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c0d11]/80 via-transparent to-transparent" />
      {size === "lg" && (
        // แสงสีลอยช้าๆ บน hero หน้าแรก (หยุดนิ่งถ้าผู้ใช้ตั้งลดการเคลื่อนไหว)
        <div aria-hidden className="hero-par-orbs pointer-events-none absolute inset-0 -z-10 overflow-hidden mix-blend-screen">
          <div className="orb absolute -left-[10%] top-[5%] h-[55%] w-[45%] rounded-full bg-indigo-600/40 blur-3xl" />
          <div className="orb absolute left-[30%] top-[45%] h-[50%] w-[35%] rounded-full bg-fuchsia-600/30 blur-3xl [animation-delay:-6s]" />
          <div className="orb absolute right-[5%] top-[-10%] h-[45%] w-[30%] rounded-full bg-cyan-500/20 blur-3xl [animation-delay:-11s]" />
        </div>
      )}
      <div className={`relative mx-auto flex max-w-6xl flex-col justify-end px-4 pb-8 pt-10 text-white sm:px-6 ${height} ${size === "lg" ? "hero-par-content" : ""}`}>
        {children}
      </div>
    </section>
  );
}

/** ไล่สีแบรนด์บนพื้นเข้ม (ใช้ใน banner) */
// ไล่สีกลับมาที่ indigo ทั้งสองปลาย ให้ gradient-pan วนต่อกันได้ไม่เห็นรอยต่อ
export const brandGradientText = "gradient-pan bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent";
