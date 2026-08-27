import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { LogoMarquee } from "./LogoMarquee";
import { PartnersSection } from "./PartnersSection";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-neutral-900 dark:text-neutral-100"
        >
          <Image
            src="/images/app/app_logo.png"
            alt="PromptPilot"
            width={32}
            height={32}
            className="rounded-lg"
            unoptimized
          />
          <span className="hidden sm:inline">แนะนำการใช้ AI</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
          >
            หมวดหมู่ทั้งหมด
          </Link>
        </nav>

        <ThemeToggle />
      </div>

      <PartnersSection />
      <LogoMarquee />
    </header>
  );
}
