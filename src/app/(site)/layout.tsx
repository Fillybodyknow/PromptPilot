import { ViewTransition } from "react";
import { PointerTilt } from "@/components/site/PointerTilt";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

/** โครงหน้าของเว็บ (ทุกหน้าหลัง login): top bar, footer, ปุ่มกลับขึ้นบน — หน้า login ใช้โครงของตัวเองใน (auth) */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* เปลี่ยนหน้าแบบจางออก-เลื่อนขึ้น (ดู .page ใน globals.css) — header/footer อยู่นอกจึงนิ่ง */}
      <ViewTransition default="page">
        <div className="flex-1">{children}</div>
      </ViewTransition>
      <SiteFooter />
      <a
        href="#top"
        aria-label="กลับขึ้นด้านบน"
        className="to-top fixed bottom-5 right-5 z-30 h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
      >
        ↑
      </a>
      <PointerTilt />
    </>
  );
}
