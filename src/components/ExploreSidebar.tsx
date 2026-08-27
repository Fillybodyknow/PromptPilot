"use client";

import { useState } from "react";
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
  count: number;
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
  const [query, setQuery] = useState("");

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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = normalizedQuery
    ? groups
        .map((g) => ({
          ...g,
          categories: g.categories.filter((c) =>
            c.titleTh.toLowerCase().includes(normalizedQuery)
          ),
        }))
        .filter((g) => g.categories.length > 0)
    : groups;

  return (
    <div>
      <div className="relative mb-5">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-neutral-500">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาหมวดหมู่..."
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-8 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-colors focus:border-indigo-400/50 focus:bg-white/10"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="px-1 text-sm text-neutral-500">ไม่พบหมวดหมู่ที่ค้นหา</p>
      ) : (
        <nav className="space-y-6">
          {filteredGroups.map((group) => (
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
                      className={`flex items-center justify-between gap-2 rounded-lg border-l-2 py-2 pr-3 pl-3 text-sm transition-all ${
                        active
                          ? "border-indigo-400 bg-indigo-500/10 font-medium text-indigo-300"
                          : "border-transparent text-neutral-400 hover:translate-x-0.5 hover:border-white/20 hover:bg-white/5 hover:text-neutral-100"
                      }`}
                    >
                      <span>{category.titleTh}</span>
                      <span
                        className={`text-xs tabular-nums ${active ? "text-indigo-400" : "text-neutral-600"}`}
                      >
                        {category.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
