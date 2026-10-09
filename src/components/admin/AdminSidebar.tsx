"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface AdminCounts {
  news: number;
  suggestions: number;
  users: number;
}

interface Item {
  href: string;
  label: string;
  icon: string;
  badge?: keyof AdminCounts;
  adminOnly?: boolean;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "",
    items: [{ href: "/admin", label: "ภาพรวม", icon: "M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" }],
  },
  {
    title: "ข่าว",
    items: [
      { href: "/admin/news", label: "อนุมัติข่าว", icon: "M5 5h11v14H6a1 1 0 0 1-1-1zM16 9h3v9a1 1 0 0 1-1 1h-2M8 9h5M8 12h5M8 15h3", badge: "news" },
      { href: "/admin/sources", label: "แหล่งข่าว", icon: "M5 19h.01M5 12a7 7 0 0 1 7 7M5 5a14 14 0 0 1 14 14" },
      { href: "/admin/runs", label: "ประวัติการดึงข่าว", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" },
    ],
  },
  {
    title: "เนื้อหา",
    items: [
      { href: "/admin/tools", label: "เครื่องมือ", icon: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" },
      {
        href: "/admin/guides",
        label: "คู่มือและ prompt",
        icon: "M12 6.25v13M12 6.25C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5s3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25",
      },
      { href: "/admin/suggestions", label: "ข้อเสนอแก้ไขจาก AI", icon: "M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6-4.6-1.9 4.6-1.9zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z", badge: "suggestions" },
    ],
  },
  {
    title: "ระบบ",
    items: [
      { href: "/admin/users", label: "ผู้ใช้", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.87M16 5.13a3 3 0 0 1 0 5.75", badge: "users", adminOnly: true },
    ],
  },
];

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

function NavList({ counts, isAdmin, pathname }: { counts: AdminCounts; isAdmin: boolean; pathname: string }) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={g.title || "home"}>
            {g.title && <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</p>}
            <ul className="flex flex-col gap-0.5">
              {items.map((i) => {
                const active = isActive(pathname, i.href);
                const n = i.badge ? counts[i.badge] : 0;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
                        active ? "bg-brand-soft font-semibold text-brand" : "text-ink hover:bg-chip"
                      }`}
                    >
                      <Icon d={i.icon} />
                      <span className="min-w-0 flex-1 truncate">{i.label}</span>
                      {n > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${i.badge === "users" ? "bg-urgent text-background" : "bg-warn text-background"}`}
                          aria-label={`${n} รายการรอดำเนินการ`}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * เมนูผู้ดูแล — จอใหญ่เป็น sidebar ติดซ้าย, จอเล็กเป็นปุ่ม "เมนูผู้ดูแล" ที่กางรายการเดียวกันออกมา
 * ตัวเลขบนเมนู = งานที่รอคนทำ (ข่าวรออนุมัติ, ข้อเสนอจาก AI, คำขอเข้าใช้)
 */
export function AdminSidebar({ counts, isAdmin }: { counts: AdminCounts; isAdmin: boolean }) {
  const pathname = usePathname();
  // จำว่ากางเมนูไว้ที่หน้าไหน — เปลี่ยนหน้าแล้วเมนูบนมือถือพับเอง
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (fn: (v: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);
  const current = GROUPS.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));
  const total = counts.news + counts.suggestions + (isAdmin ? counts.users : 0);

  return (
    <>
      {/* จอเล็ก */}
      <div className="border-b border-line bg-surface px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-menu-mobile"
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-chip"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Admin</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{current?.label ?? "เมนูผู้ดูแล"}</span>
          {total > 0 && <span className="rounded-full bg-warn px-2 py-0.5 text-xs font-bold text-background">{total}</span>}
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <nav id="admin-menu-mobile" aria-label="เมนูผู้ดูแล" className="pb-3 pt-2">
            <NavList counts={counts} isAdmin={isAdmin} pathname={pathname} />
          </nav>
        )}
      </div>

      {/* จอใหญ่ */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <nav aria-label="เมนูผู้ดูแล" className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-6">
          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-muted">เมนูผู้ดูแล</p>
          <NavList counts={counts} isAdmin={isAdmin} pathname={pathname} />
        </nav>
      </aside>
    </>
  );
}
