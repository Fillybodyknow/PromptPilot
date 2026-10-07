import Image from "next/image";
import Link from "next/link";
import { withBasePath } from "@/lib/basePath";
import { ThemeToggle } from "../ThemeToggle";
import { SearchIcon } from "./icons";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6 md:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src={withBasePath("/images/app/app_logo.png")}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
            unoptimized
          />
          <span className="text-lg font-bold tracking-tight">PromptPilot</span>
        </Link>
        <div className="hidden md:block">
          <MainNav />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <form action={withBasePath("/search")} role="search" className="hidden lg:block">
            <label className="flex h-11 w-72 items-center gap-2 rounded-lg border border-line bg-background px-3 text-muted">
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
            className="hidden h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-chip md:flex lg:hidden"
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
