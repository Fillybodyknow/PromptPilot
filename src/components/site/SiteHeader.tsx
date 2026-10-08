import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { countPending, isStaff, ROLE_LABEL } from "@/lib/auth/users";
import { withBasePath } from "@/lib/basePath";
import { PartnersSection } from "../PartnersSection";
import { ThemeToggle } from "../ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { AdminButton, UserMenu, type HeaderUser } from "./UserMenu";

export async function SiteHeader() {
  // หน้า login ไม่มี session — header แสดงแค่โลโก้และเมนู
  const session = await getSessionUser();
  const user: HeaderUser | null = session && {
    name: session.displayName ?? session.email,
    email: session.email,
    roleLabel: ROLE_LABEL[session.role],
    staff: isStaff(session.role),
    admin: session.role === "admin",
    pending: session.role === "admin" ? await countPending() : 0,
  };
  return (
    <header className="site-header header-scroll sticky top-0 z-40 isolate border-b border-line">
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
            {/* ซ่อนชื่อบนจอแคบ และช่วง lg (1024–1279px) ที่ top bar มีทั้งเมนู ปุ่ม Admin และชื่อผู้ใช้ — ให้โลโก้พาร์ทเนอร์ทั้ง 5 ยังอยู่ในแถวเดียวได้ */}
            <span className="hidden text-lg font-bold tracking-tight sm:inline lg:hidden xl:inline">PromptPilot</span>
          </Link>
        </div>
        {/* แถบพาร์ทเนอร์กินที่ ~200–260px — เมนูเต็มจึงเริ่มที่ lg และช่องค้นหาเต็มที่ xl ไม่อย่างนั้นแถวล้น */}
        <div className="hidden lg:block">
          <MainNav />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user && <CommandPalette />}
          {user && <AdminButton user={user} />}
          <ThemeToggle />
          {user && <UserMenu user={user} />}
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
