"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUP_ICON: Record<string, string> = {
  ผู้ช่วยทั่วไป: "💬",
  งานเอกสาร: "📄",
  งานพัฒนาระบบ: "💻",
  งานข้อมูล: "📊",
  งานออกแบบ: "🎨",
  งานสื่อสาร: "🎙️",
  งานระบบ: "⚙️",
};

interface SidebarCategory {
  key: string;
  titleTh: string;
}

interface SidebarGroup {
  group: string;
  categories: SidebarCategory[];
}

interface ExploreSidebarProps {
  groups: SidebarGroup[];
  /** "sidebar" = vertical, grouped, for desktop. "mobile" = flat horizontal scroll strip. */
  variant?: "sidebar" | "mobile";
}

export function ExploreSidebar({ groups, variant = "sidebar" }: ExploreSidebarProps) {
  const pathname = usePathname();

  if (variant === "mobile") {
    const flat = groups.flatMap((g) => g.categories);
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {flat.map((category) => {
          const href = `/explore/${category.key}`;
          const active = pathname === href;
          return (
            <Link
              key={category.key}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
              }`}
            >
              {category.titleTh}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.group}>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            <span aria-hidden>{GROUP_ICON[group.group] ?? "🔹"}</span>
            {group.group}
          </div>
          <div className="space-y-0.5">
            {group.categories.map((category) => {
              const href = `/explore/${category.key}`;
              const active = pathname === href;
              return (
                <Link
                  key={category.key}
                  href={href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-indigo-500/15 font-medium text-indigo-300"
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
                  }`}
                >
                  {category.titleTh}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
