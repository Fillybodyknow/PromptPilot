import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, SectionTitle } from "@/components/admin/AdminPage";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { countPending } from "@/lib/auth/users";
import { catalogCounts } from "@/lib/catalog/admin";
import { countSuggestionsByStatus, listCheckRuns } from "@/lib/content/repo";
import { countByStatus, latestRun } from "@/lib/news/repo";
import { budgetStatus } from "@/lib/ai/usage";
import { getAutoApproveNews } from "@/lib/settings";

export const metadata: Metadata = { title: "ภาพรวมผู้ดูแล" };

const fmt = (d: Date | string) => new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });

interface Stat {
  href: string;
  title: string;
  value: string;
  note: string;
}

function StatCard({ s }: { s: Stat }) {
  return (
    <Link href={s.href} className={`${card} group flex min-w-0 flex-col gap-1 p-5 transition-colors hover:border-ink`}>
      <span className="text-sm text-muted">{s.title}</span>
      <span className="text-xl font-bold">{s.value}</span>
      <span className="text-[13px] leading-relaxed text-muted">{s.note}</span>
      <span className="mt-auto pt-2 text-sm font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">เปิด →</span>
    </Link>
  );
}

export default async function AdminHomePage() {
  const me = await requireAdminPage();
  const isAdmin = me.role === "admin";
  const [news, catalog, run, pendingUsers, autoApprove, suggestions, [check], budget] = await Promise.all([
    countByStatus(),
    catalogCounts(),
    latestRun(),
    isAdmin ? countPending() : 0,
    getAutoApproveNews(),
    countSuggestionsByStatus(),
    listCheckRuns(1),
    budgetStatus(),
  ]);

  // งานที่รอคน — เรียงตามความเร่งด่วน
  const todo = [
    ...(budget.level === "over"
      ? [{ href: "/admin/ai-usage", text: `เกินงบ AI เดือนนี้ (${Math.round(budget.spentThb)}/${budget.budgetThb} บาท) — การตรวจข้อมูลอัตโนมัติหยุดแล้ว`, tone: "urgent" as const }]
      : budget.level === "warn"
        ? [{ href: "/admin/ai-usage", text: `ใช้งบ AI ไปแล้ว ${Math.round((budget.ratio ?? 0) * 100)}% (${Math.round(budget.spentThb)}/${budget.budgetThb} บาท)`, tone: "warn" as const }]
        : []),
    ...(isAdmin && pendingUsers > 0 ? [{ href: "/admin/users", text: `${pendingUsers} คำขอเข้าใช้งานรออนุมัติ`, tone: "urgent" as const }] : []),
    ...(run?.status === "failed" ? [{ href: "/admin/runs", text: `ดึงข่าวรอบล่าสุดมีปัญหา (${fmt(run.startedAt)})`, tone: "urgent" as const }] : []),
    ...((news.pending ?? 0) > 0 ? [{ href: "/admin/news", text: `${news.pending} ข่าวรออนุมัติ`, tone: "warn" as const }] : []),
    ...((suggestions.pending ?? 0) > 0 ? [{ href: "/admin/suggestions", text: `${suggestions.pending} ข้อเสนอแก้ไขจาก AI รอตรวจ`, tone: "warn" as const }] : []),
  ];

  const groups: { title: string; stats: Stat[] }[] = [
    {
      title: "ข่าว",
      stats: [
        { href: "/admin/news", title: "ข่าว", value: `อนุมัติแล้ว ${news.approved ?? 0}`, note: `รออนุมัติ ${news.pending ?? 0} · อนุมัติอัตโนมัติ${autoApprove.enabled ? "เปิด" : "ปิด"}` },
        { href: "/admin/sources", title: "แหล่งข่าว", value: `${catalog.enabledSources} แหล่ง`, note: "ที่เปิดใช้ในการดึงข่าวรายวัน" },
        {
          href: "/admin/runs",
          title: "ดึงข่าวรอบล่าสุด",
          value: run ? { running: "กำลังทำงาน", ok: "สำเร็จ", failed: "มีปัญหา" }[run.status] : "ยังไม่เคยดึง",
          note: run ? fmt(run.startedAt) : "",
        },
      ],
    },
    {
      title: "เนื้อหา",
      stats: [
        { href: "/admin/tools", title: "เครื่องมือ", value: `${catalog.tools} รายการ`, note: "เพิ่ม แก้ไข เรียงลำดับ ติดธงแนะนำ" },
        { href: "/admin/guides", title: "คู่มือและ prompt", value: `${catalog.guides} หมวด`, note: `prompt ตัวอย่าง ${catalog.prompts} ตัว` },
        {
          href: "/admin/suggestions",
          title: "ข้อเสนอแก้ไขจาก AI",
          value: `${suggestions.pending ?? 0} รอตรวจ`,
          note: check ? `AI ตรวจล่าสุด ${fmt(check.startedAt)}` : "สั่งตรวจได้จากหน้าแก้ไขเครื่องมือ",
        },
      ],
    },
    ...(isAdmin
      ? [{ title: "ระบบ", stats: [{ href: "/admin/users", title: "ผู้ใช้", value: `${pendingUsers} คำขอรออนุมัติ`, note: "อนุมัติคำขอ กำหนดสิทธิ์ ปิดใช้บัญชี" }] }]
      : []),
  ];

  return (
    <AdminPage title="ภาพรวมผู้ดูแล" description={`สวัสดี ${me.displayName ?? me.email} — งานที่รอคุณอยู่ด้านบน สถานะของแต่ละส่วนอยู่ด้านล่าง`}>
      <section aria-labelledby="todo">
        <SectionTitle id="todo" title="ต้องดำเนินการ" />
        {todo.length === 0 ? (
          <p className="rounded-2xl bg-good-bg px-5 py-4 font-medium text-good">ไม่มีงานค้าง ทุกอย่างเรียบร้อย</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todo.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl px-5 py-3 font-semibold transition-opacity hover:opacity-85 ${
                    t.tone === "urgent" ? "bg-urgent-bg text-urgent" : "bg-warn-bg text-warn"
                  }`}
                >
                  {t.text}
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {groups.map((g) => (
        <section key={g.title} className="mt-8" aria-label={g.title}>
          <SectionTitle title={g.title} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.stats.map((s) => (
              <StatCard key={s.href} s={s} />
            ))}
          </div>
        </section>
      ))}
    </AdminPage>
  );
}
