import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, btnPrimary, EmptyState, FilterTabs } from "@/components/admin/AdminPage";
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
    <AdminPage
      title="เครื่องมือ"
      description="เลือกหมวด แล้วกดชื่อเครื่องมือเพื่อแก้ไข · บันทึกแล้วหน้าเว็บอัปเดตทันที · ให้ AI ตรวจกับหน้าทางการได้จากหน้าแก้ไข"
      actions={
        <Link href={`/admin/tools/new?category=${category.key}`} className={btnPrimary}>
          + เพิ่มเครื่องมือในหมวดนี้
        </Link>
      }
    >
      <FilterTabs
        label="เลือกหมวด"
        items={CATEGORIES.map((c) => ({ href: `/admin/tools?category=${c.key}`, label: c.titleTh, active: c.key === category.key }))}
      />

      <div className={`${card} mt-5 overflow-x-auto ${rows.length === 0 ? "hidden" : ""}`}>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">เครื่องมือในหมวด{category.titleTh}</caption>
          <thead>
            <tr className="bg-chip text-left text-muted">
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
                  <Link href={`/admin/tools/${r.id}`} className="text-[15px] font-semibold text-brand hover:underline">
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
      </div>
      {rows.length === 0 && (
        <div className="mt-5">
          <EmptyState>ยังไม่มีเครื่องมือในหมวดนี้</EmptyState>
        </div>
      )}
    </AdminPage>
  );
}
