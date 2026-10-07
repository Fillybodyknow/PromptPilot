import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { IdButton, TextField } from "@/components/admin/fields";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { listSourceRows } from "@/lib/catalog/admin";
import { addSource, removeSource, testSource, toggleSource } from "./actions";

export const metadata: Metadata = { title: "จัดการแหล่งข่าว" };

export default async function AdminSourcesPage() {
  await requireAdminPage();
  const sources = await listSourceRows();
  const enabled = sources.filter((s) => s.enabled).length;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold">จัดการแหล่งข่าว</h1>
      <p className="mt-1 text-sm text-muted">
        เปิดใช้ {enabled} จาก {sources.length} แหล่ง · สคริปต์ดึงข่าวรายวันใช้เฉพาะแหล่งที่เปิดอยู่ (สูงสุด 15 ข่าวต่อแหล่งต่อรอบ)
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {sources.map((s) => (
          <div key={s.id} className={`${card} p-4 ${s.enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.enabled ? "bg-good-bg text-good" : "bg-chip text-muted"}`}>
                    {s.enabled ? "เปิดใช้" : "ปิดอยู่"}
                  </span>
                </div>
                <p className="mt-1 break-all text-[13px] text-muted">{s.url}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <IdButton action={toggleSource} id={s.id} label={s.enabled ? "ปิดใช้" : "เปิดใช้"} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <ActionForm action={testSource} submitLabel="ทดสอบ feed" pendingLabel="กำลังดึง…" variant="neutral" className="[&>div]:mt-0">
                <input type="hidden" name="id" value={s.id} />
              </ActionForm>
              <details className="text-sm">
                <summary className="cursor-pointer text-urgent">ลบ</summary>
                <div className="mt-2">
                  <IdButton action={removeSource} id={s.id} label={`ยืนยันลบ ${s.name}`} className="border-urgent text-urgent" />
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-dashed border-line p-5" aria-labelledby="add">
        <h2 id="add" className="font-bold">
          เพิ่มแหล่งข่าว
        </h2>
        <p className="mt-1 text-sm text-muted">ระบบจะลองดึง feed ให้ก่อน ถ้าดึงไม่ได้จะยังไม่เพิ่ม</p>
        <ActionForm action={addSource} submitLabel="ทดสอบและเพิ่ม" pendingLabel="กำลังทดสอบ feed…" className="mt-4" resetOnSuccess>
          <div className="flex flex-wrap gap-4">
            <TextField name="name" label="ชื่อแหล่งข่าว" required placeholder="เช่น Microsoft 365" />
            <TextField name="url" label="URL ของ RSS/Atom feed" type="url" required placeholder="https://…/feed" />
          </div>
        </ActionForm>
      </section>
    </main>
  );
}
