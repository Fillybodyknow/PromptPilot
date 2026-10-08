"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

export function MainNav({ vertical = false, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className={vertical ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center whitespace-nowrap rounded-lg px-3.5 text-[15px] transition-colors ${
              active ? "bg-brand-soft font-semibold text-brand" : "font-medium text-ink hover:bg-chip"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
