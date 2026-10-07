import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const LINKS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/news", label: "อนุมัติข่าว" },
  { href: "/admin/tools", label: "เครื่องมือ" },
  { href: "/admin/guides", label: "คู่มือและ prompt" },
  { href: "/admin/sources", label: "แหล่งข่าว" },
  { href: "/admin/runs", label: "ประวัติการดึงข่าว" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav aria-label="เมนูผู้ดูแล" className="border-b border-line bg-chip">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6">
          <span className="mr-2 text-xs font-bold uppercase tracking-wide text-muted">Admin</span>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-surface">
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  );
}
