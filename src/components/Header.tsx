import Link from "next/link";
import Image from "next/image";
import { LogoMarquee } from "./LogoMarquee";
import { PartnersSection } from "./PartnersSection";
import { ThemeToggle } from "./ThemeToggle";
import { withBasePath } from "@/lib/basePath";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl light:border-black/10 light:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <PartnersSection />
          <div
            className="h-6 w-px shrink-0 bg-white/15 sm:h-7 light:bg-black/10"
            aria-hidden
          />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-semibold text-neutral-100 light:text-neutral-900"
          >
            <Image
              src={withBasePath("/images/app/app_logo.png")}
              alt="PromptPilot"
              width={32}
              height={32}
              className="h-7 w-7 rounded-lg sm:h-8 sm:w-8"
              unoptimized
            />
            <span className="hidden sm:inline">PromptPilot</span>
          </Link>
        </div>

        <ThemeToggle />
      </div>

      <LogoMarquee />
    </header>
  );
}
