import type { Metadata } from "next";
import Link from "next/link";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { countPending } from "@/lib/auth/users";
import { catalogCounts } from "@/lib/catalog/admin";
import { countByStatus, latestRun } from "@/lib/news/repo";

export const metadata: Metadata = { title: "ภาพรวมผู้ดูแล" };

export default async function AdminHomePage() {
  const me = await requireAdminPage();
  const [news, catalog, run, pendingUsers] = await Promise.all([countByStatus(), catalogCounts(), latestRun(), me.role === "admin" ? countPending() : 0]);
  const cards = [
    // เฉพาะผู้ดูแลระบบ: แจ้งคำขอเข้าใช้งานที่ยังไม่ได้ตัดสิน
    ...(me.role === "admin"
      ? [{ href: "/admin/users", title: "ผู้ใช้", value: `${pendingUsers} คำขอรออนุมัติ`, note: "อนุมัติคำขอ กำหนดสิทธิ์ ปิดใช้บัญชี", highlight: pendingUsers > 0 }]
      : []),
    { href: "/admin/news", title: "อนุมัติข่าว", value: `${news.pending ?? 0} รออนุมัติ`, note: `อนุมัติแล้ว ${news.approved ?? 0} · ข่าวซ้ำ ${news.duplicate ?? 0}`, highlight: (news.pending ?? 0) > 0 },
    { href: "/admin/tools", title: "เครื่องมือ", value: `${catalog.tools} รายการ`, note: "เพิ่ม แก้ไข เรียงลำดับ ติดธงแนะนำ" },
    { href: "/admin/guides", title: "คู่มือและ prompt", value: `${catalog.guides} หมวด`, note: `prompt ${catalog.prompts} ตัว` },
    { href: "/admin/sources", title: "แหล่งข่าว", value: `${catalog.enabledSources} แหล่งที่เปิดใช้`, note: "เพิ่ม ปิด ทดสอบ feed" },
    {
      href: "/admin/runs",
      title: "ดึงข่าวรอบล่าสุด",
      value: run ? { running: "กำลังทำงาน", ok: "สำเร็จ", failed: "มีปัญหา" }[run.status] : "ยังไม่เคยดึง",
      note: run ? new Date(run.startedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "",
      highlight: run?.status === "failed",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold">ภาพรวมผู้ดูแล</h1>
      <div className="mt-6 flex flex-wrap gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={`${card} flex min-w-0 flex-[1_1_260px] flex-col gap-1 p-5 hover:border-ink ${c.highlight ? "border-warn" : ""}`}>
            <span className="text-sm text-muted">{c.title}</span>
            <span className="text-xl font-bold">{c.value}</span>
            <span className="text-[13px] text-muted">{c.note}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
