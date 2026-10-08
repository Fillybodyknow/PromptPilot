import Image from "next/image";
import Link from "next/link";
import { withBasePath } from "@/lib/basePath";
import { PartnersSection } from "../PartnersSection";
import { ThemeToggle } from "../ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";

export function SiteHeader() {
  return (
    <header className="header-scroll sticky top-0 z-40 isolate border-b border-line">
      {/* blur อยู่บนชั้นพื้นหลังแยก ไม่ใส่ที่ header ตรงๆ เพราะ backdrop-filter ทำให้เมนูมือถือ (position: fixed) ถูกขังอยู่ในกรอบ header */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-surface/85 backdrop-blur-lg" />
      {/* เต็มความกว้างจอ (ไม่จำกัด max-w เหมือนเนื้อหา) เหลือแค่ระยะขอบเล็กน้อยไม่ให้ชิดขอบจอ */}
      <div className="flex w-full items-center gap-3 px-4 py-2 sm:px-6 md:gap-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <PartnersSection />
          <span aria-hidden className="h-7 w-px shrink-0 bg-line" />
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="PromptPilot หน้าแรก">
            <Image
              src={withBasePath("/images/app/app_logo.png")}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
              unoptimized
            />
            {/* ซ่อนชื่อบนจอแคบ ให้โลโก้พาร์ทเนอร์ทั้ง 5 ยังอยู่ในแถวเดียวได้ */}
            <span className="hidden text-lg font-bold tracking-tight sm:inline">PromptPilot</span>
          </Link>
        </div>
        {/* แถบพาร์ทเนอร์กินที่ ~200–260px — เมนูเต็มจึงเริ่มที่ lg และช่องค้นหาเต็มที่ xl ไม่อย่างนั้นแถวล้น */}
        <div className="hidden lg:block">
          <MainNav />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
