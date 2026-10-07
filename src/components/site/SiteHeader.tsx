import Image from "next/image";
import Link from "next/link";
import { withBasePath } from "@/lib/basePath";
import { PartnersSection } from "../PartnersSection";
import { ThemeToggle } from "../ThemeToggle";
import { SearchIcon } from "./icons";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6 md:gap-6">
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
          <form action={withBasePath("/search")} role="search" className="hidden xl:block">
            <label className="flex h-11 w-56 items-center gap-2 rounded-lg border border-line bg-background px-3 text-muted">
              <SearchIcon />
              <input
                type="search"
                name="q"
                placeholder="ค้นหาข่าว เครื่องมือ หรือคู่มือ"
                aria-label="ค้นหา"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </label>
          </form>
          <Link
            href="/search"
            aria-label="ค้นหา"
            className="hidden h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-chip lg:flex xl:hidden"
          >
            <SearchIcon />
          </Link>
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
