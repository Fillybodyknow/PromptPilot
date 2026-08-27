import Link from "next/link";
import Image from "next/image";
import { LogoMarquee } from "./LogoMarquee";
import { PartnersSection } from "./PartnersSection";
import { ThemeToggle } from "./ThemeToggle";
import { withBasePath } from "@/lib/basePath";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl light:border-black/10 light:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <PartnersSection />
          <div className="hidden h-6 w-px bg-white/15 light:bg-black/10 lg:block" aria-hidden />
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-neutral-100 light:text-neutral-900"
          >
            <Image
              src={withBasePath("/images/app/app_logo.png")}
              alt="PromptPilot"
              width={32}
              height={32}
              className="rounded-lg"
              unoptimized
            />
            <span className="hidden sm:inline">PromptPilot</span>
          </Link>
        </div>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/explore"
            className="rounded-md px-3 py-1.5 font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white light:text-neutral-600 light:hover:bg-black/5 light:hover:text-neutral-900"
          >
            สำรวจหมวดหมู่ AI
          </Link>
          <ThemeToggle />
        </nav>
      </div>

      <LogoMarquee />
    </header>
  );
}
