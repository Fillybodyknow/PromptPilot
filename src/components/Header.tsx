import Link from "next/link";
import Image from "next/image";
import { LogoMarquee } from "./LogoMarquee";
import { PartnersSection } from "./PartnersSection";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <PartnersSection />
          <div className="hidden h-6 w-px bg-white/15 lg:block" aria-hidden />
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-neutral-100">
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
        </div>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/explore"
            className="rounded-md px-3 py-1.5 font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            สำรวจหมวดหมู่ AI
          </Link>
        </nav>
      </div>

      <LogoMarquee />
    </header>
  );
}
