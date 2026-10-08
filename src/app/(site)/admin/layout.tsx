import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { countPending } from "@/lib/auth/users";
import { countSuggestionsByStatus } from "@/lib/content/repo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const LINKS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/news", label: "อนุมัติข่าว" },
  { href: "/admin/tools", label: "เครื่องมือ" },
  { href: "/admin/guides", label: "คู่มือและ prompt" },
  { href: "/admin/sources", label: "แหล่งข่าว" },
  { href: "/admin/runs", label: "ประวัติการดึงข่าว" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ใช้เลือกเมนูที่แสดง (ชื่อผู้ใช้/ออกจากระบบอยู่ในเมนูผู้ใช้บน top bar แล้ว) — การกันสิทธิ์จริงอยู่ที่ requireAdminPage ในแต่ละหน้า (layout ไม่ render ใหม่ทุกครั้งที่เปลี่ยนหน้า)
  const user = await getSessionUser();
  const pending = user?.role === "admin" ? await countPending() : 0;
  const suggestions = user && user.role !== "viewer" ? ((await countSuggestionsByStatus()).pending ?? 0) : 0;
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
          <Link href="/admin/suggestions" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface">
            ข้อเสนอแก้ไข
            {suggestions > 0 && (
              <span className="rounded-full bg-warn px-2 py-0.5 text-xs font-bold text-background" aria-label={`${suggestions} ข้อเสนอรอตรวจ`}>
                {suggestions}
              </span>
            )}
          </Link>
          {/* การจัดการผู้ใช้เห็นเฉพาะผู้ดูแลระบบ (หน้าเองก็กันสิทธิ์อีกชั้น) */}
          {user?.role === "admin" && (
            <Link href="/admin/users" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface">
              ผู้ใช้
              {pending > 0 && (
                <span className="rounded-full bg-urgent px-2 py-0.5 text-xs font-bold text-background" aria-label={`${pending} คำขอรออนุมัติ`}>
                  {pending}
                </span>
              )}
            </Link>
          )}
        </div>
      </nav>
      {children}
    </>
  );
}
