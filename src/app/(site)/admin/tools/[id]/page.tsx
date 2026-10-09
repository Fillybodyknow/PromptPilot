import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminPage } from "@/components/admin/AdminPage";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { ToolFields } from "@/components/admin/ToolFields";
import { requireAdminPage } from "@/lib/adminSession";
import { getToolRow } from "@/lib/catalog/admin";
import { toolFormValues } from "@/lib/catalog/forms";
import { loadAllEntries } from "@/lib/catalog/repo";
import { getCategory } from "@/lib/categories";
import { latestCheckRunFor, listWatchPages, pendingSuggestionFor } from "@/lib/content/repo";
import { defaultWatchUrls } from "@/lib/content/toolCheck";
import { one, type SearchParams } from "@/lib/params";
import { saveWatchPages, triggerToolCheck } from "../../suggestions/actions";
import { removeTool, saveTool } from "../actions";

export const metadata: Metadata = { title: "แก้ไขเครื่องมือ" };

export default async function EditToolPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  const row = Number.isInteger(id) && id > 0 ? await getToolRow(id) : null;
  const category = row ? getCategory(row.categoryKey) : undefined;
  if (!row || !category) notFound();
  // อ่านแบบเดียวกับที่หน้าเว็บอ่าน (รวม extra fields) แล้วแปลงเป็นค่าในฟอร์ม
  const entry = (await loadAllEntries())[row.categoryKey]?.find((e) => e.id === row.slug) ?? {};
  const created = one((await searchParams).created) === "1";
  const [watch, lastRun, pendingSuggestion] = await Promise.all([listWatchPages(row.id), latestCheckRunFor(`tool:${row.id}`), pendingSuggestionFor("tool", String(row.id))]);
  const running = lastRun?.status === "running";

  return (
    <AdminPage
      width="narrow"
      back={{ href: `/admin/tools?category=${category.key}`, label: `เครื่องมือหมวด${category.titleTh}` }}
      title={row.name}
      description={`หมวด${category.titleTh} · ย้ายหมวดไม่ได้ ถ้าต้องการให้เพิ่มใหม่ในหมวดที่ถูกแล้วลบตัวนี้`}
      actions={
        <Link href={`/tools/${category.key}/${row.slug}`} className="text-sm font-semibold text-brand hover:underline">
          ดูหน้าเว็บ →
        </Link>
      }
    >
      {created && <p className="mb-6 rounded-xl bg-good-bg px-4 py-3 text-sm text-good">เพิ่มเครื่องมือแล้ว และแสดงบนหน้าเว็บแล้ว</p>}

      {/* ---------- ให้ AI ตรวจกับหน้าทางการ ---------- */}
      <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">ตรวจข้อมูลด้วย AI</h2>
            <p className="mt-1 text-muted">
              ข้อมูลตรวจล่าสุด {row.verifiedAt}
              {lastRun && (
                <>
                  {" "}
                  · AI ตรวจล่าสุด {lastRun.startedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })} —{" "}
                  <span className={lastRun.status === "failed" ? "text-urgent" : ""}>{running ? "กำลังตรวจ…" : lastRun.message}</span>
                  {running && <AutoRefresh />}
                </>
              )}
            </p>
            {pendingSuggestion && (
              <Link href="/admin/suggestions" className="mt-2 inline-block font-semibold text-brand hover:underline">
                มีข้อเสนอแก้ไขรอตรวจ ({pendingSuggestion.changes.length} รายการ) →
              </Link>
            )}
          </div>
          <ActionForm action={triggerToolCheck} submitLabel={running ? "กำลังตรวจ…" : "ให้ AI ตรวจตัวนี้"} pendingLabel="กำลังเริ่ม…" variant="neutral" className="[&>div]:mt-0">
            <input type="hidden" name="toolId" value={row.id} />
          </ActionForm>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-muted hover:text-ink">หน้าที่ใช้ตรวจ ({watch.length || `ยังไม่ได้ตั้ง — จะใช้ ${defaultWatchUrls(row.url).join(", ")}`})</summary>
          <ActionForm action={saveWatchPages} submitLabel="บันทึกหน้าที่ใช้ตรวจ" variant="neutral" className="mt-3">
            <input type="hidden" name="toolId" value={row.id} />
            <p className="mb-2 text-muted">ใส่ลิงก์หน้าทางการของผู้ให้บริการ บรรทัดละ 1 ลิงก์ ไม่เกิน 5 หน้า เช่น หน้าราคา หน้ารายละเอียดโมเดล ควรเป็นหน้าที่เปิดแล้วเห็นข้อความทันที (ไม่ต้อง login)</p>
            <textarea name="urls" rows={4} defaultValue={watch.map((w) => w.url).join("\n")} className="w-full rounded-lg border border-line bg-background px-3 py-2 font-mono text-xs" />
            {watch.some((w) => w.lastStatus) && (
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {watch.map((w) => (
                  <li key={w.id} className="break-all">
                    {w.url} — {w.lastStatus ?? "ยังไม่เคยเปิด"}
                  </li>
                ))}
              </ul>
            )}
          </ActionForm>
        </details>
      </section>

      <ActionForm action={saveTool} submitLabel="บันทึก" className="mt-6">
        <input type="hidden" name="rowId" value={row.id} />
        <ToolFields category={category} values={toolFormValues(entry)} featured={row.featured} />
      </ActionForm>

      <details className="mt-10 rounded-2xl border border-urgent/40 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-urgent">ลบเครื่องมือนี้</summary>
        <p className="mt-3 text-sm text-muted">ลบแล้วกู้คืนไม่ได้ และลิงก์ที่เคยแชร์ไปหน้าเครื่องมือนี้จะใช้ไม่ได้</p>
        <form action={removeTool} className="mt-3">
          <input type="hidden" name="id" value={row.id} />
          <button type="submit" className="h-11 rounded-lg bg-urgent px-5 text-sm font-semibold text-background">
            ยืนยันลบ {row.name}
          </button>
        </form>
      </details>
    </AdminPage>
  );
}
