import type { Metadata } from "next";
import Link from "next/link";
import { IdButton } from "@/components/admin/fields";
import { ToolStatusBadge, card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { listToolRows } from "@/lib/catalog/admin";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { formatIsoDate } from "@/lib/format";
import { one, type SearchParams } from "@/lib/params";
import { moveToolDown, moveToolUp } from "./actions";

export const metadata: Metadata = { title: "จัดการเครื่องมือ" };

export default async function AdminToolsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const raw = one((await searchParams).category);
  const category = getCategory(raw ?? "") ?? CATEGORIES[0];
  const rows = await listToolRows(category.key);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">จัดการเครื่องมือ</h1>
          <p className="mt-1 text-sm text-muted">แก้แล้วหน้าเว็บอัปเดตทันที ข้อมูลถูกตรวจด้วย schema ของหมวดก่อนบันทึก</p>
        </div>
        <Link href={`/admin/tools/new?category=${category.key}`} className="flex h-11 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-background">
          + เพิ่มเครื่องมือในหมวดนี้
        </Link>
      </div>

      <nav aria-label="เลือกหมวด" className="mt-5 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/admin/tools?category=${c.key}`}
            aria-current={c.key === category.key ? "true" : undefined}
            className={`flex min-h-9 items-center rounded-full border px-3 text-[13px] ${
              c.key === category.key ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface hover:border-ink"
            }`}
          >
            {c.titleTh}
          </Link>
        ))}
      </nav>

      <div className={`${card} mt-5 overflow-x-auto`}>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-4 py-3 font-semibold">ลำดับ</th>
              <th className="px-4 py-3 font-semibold">เครื่องมือ</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 font-semibold">ตรวจล่าสุด</th>
              <th className="px-4 py-3 font-semibold">แก้ล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-line align-middle">
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {i > 0 && <IdButton action={moveToolUp} id={r.id} label="↑" ariaLabel={`เลื่อน ${r.name} ขึ้น`} />}
                    {i < rows.length - 1 && <IdButton action={moveToolDown} id={r.id} label="↓" ariaLabel={`เลื่อน ${r.name} ลง`} />}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/tools/${r.id}`} className="font-semibold text-brand hover:underline">
                    {r.name}
                  </Link>
                  <span className="block text-[13px] text-muted">
                    {r.vendor}
                    {r.featured && " · แนะนำบนหน้าแรก"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <ToolStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2.5">{formatIsoDate(r.verifiedAt)}</td>
                <td className="px-4 py-2.5 text-[13px] text-muted">
                  {r.updatedBy ?? "-"} · {r.updatedAt.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-muted">ยังไม่มีเครื่องมือในหมวดนี้</p>}
      </div>
    </main>
  );
}
