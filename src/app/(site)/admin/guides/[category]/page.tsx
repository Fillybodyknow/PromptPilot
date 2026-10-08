import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { FieldGroup, SelectField, TextArea } from "@/components/admin/fields";
import { PromptFields } from "@/components/admin/PromptFields";
import { requireAdminPage } from "@/lib/adminSession";
import { listPromptRows } from "@/lib/catalog/admin";
import { guideFormValues, promptFormValues } from "@/lib/catalog/forms";
import { loadAllGuides } from "@/lib/catalog/repo";
import { getCategory } from "@/lib/categories";
import { ACCESS_LABEL_LONG, GUIDE_NOTE_LABEL } from "@/lib/labels";
import { accessMethodEnum, type CategoryGuide, type PromptTemplate } from "@/lib/schema";
import { deletePromptAction, movePromptDown, movePromptUp, saveGuideAction, savePromptAction } from "../actions";

export const metadata: Metadata = { title: "แก้คู่มือ" };

function MoveButton({ action, id, categoryKey, label, ariaLabel }: { action: (fd: FormData) => Promise<void>; id: number; categoryKey: string; label: string; ariaLabel: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="categoryKey" value={categoryKey} />
      <button type="submit" aria-label={ariaLabel} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface hover:border-ink">
        {label}
      </button>
    </form>
  );
}

export default async function AdminGuidePage({ params }: { params: Promise<{ category: string }> }) {
  await requireAdminPage();
  const category = getCategory((await params).category);
  if (!category) notFound();
  const [guides, prompts] = await Promise.all([loadAllGuides(), listPromptRows(category.key)]);
  const guide = (guides[category.key] ?? {}) as Partial<CategoryGuide>;
  const g = guideFormValues(guide);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Link href="/admin/guides" className="text-sm text-muted hover:text-brand">
        ← คู่มือทุกหมวด
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">คู่มือ {category.titleTh}</h1>
        <Link href={`/guides/${category.key}`} className="text-sm font-semibold text-brand hover:underline">
          ดูหน้าเว็บ →
        </Link>
      </div>

      <ActionForm action={saveGuideAction} submitLabel="บันทึกคู่มือ" className="mt-6">
        <input type="hidden" name="categoryKey" value={category.key} />
        <div className="flex flex-col gap-5">
          <FieldGroup title="เนื้อหาหลัก">
            <TextArea name="howToUse" label="ใช้ AI กับงานนี้อย่างไร" defaultValue={g.howToUse} required rows={6} />
            <TextArea name="dataHandlingNote" label="ข้อมูลที่ห้ามวางลงใน AI" defaultValue={g.dataHandlingNote} required rows={4} />
          </FieldGroup>
          <FieldGroup title="เริ่มใช้งาน">
            <SelectField name="accessMethod" label="วิธีเข้าถึง" defaultValue={g.accessMethod || "web"} options={accessMethodEnum.options.map((a) => ({ value: a, label: ACCESS_LABEL_LONG[a] ?? a }))} />
            <TextArea name="installSteps" label="ขั้นตอนเริ่มใช้" defaultValue={g.installSteps} hint="บรรทัดละ 1 ขั้นตอน ไม่บังคับ" rows={4} />
            <TextArea name="links" label="ลิงก์เริ่มใช้งาน" defaultValue={g.links} hint='บรรทัดละ 1 ลิงก์ เขียนแบบ "ชื่อ | URL" ไม่บังคับ' rows={3} />
          </FieldGroup>
          <FieldGroup title="หมายเหตุเพิ่มเติม (ไม่บังคับ)">
            {(Object.keys(GUIDE_NOTE_LABEL) as (keyof typeof GUIDE_NOTE_LABEL)[]).map((k) => (
              <TextArea key={k} name={k} label={GUIDE_NOTE_LABEL[k]} defaultValue={g[k]} rows={3} />
            ))}
          </FieldGroup>
        </div>
      </ActionForm>

      <section className="mt-12" aria-labelledby="prompts">
        <h2 id="prompts" className="text-xl font-bold">
          Prompt ตัวอย่าง ({prompts.length})
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {prompts.map((p, i) => (
            <details key={p.id} className="rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span className="font-semibold">
                  {i + 1}. {p.task}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.tested ? "bg-good-bg text-good" : "bg-warn-bg text-warn"}`}>
                  {p.tested ? "ทดสอบแล้ว" : "ร่าง"}
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <div className="mb-4 flex gap-1.5">
                  {i > 0 && <MoveButton action={movePromptUp} id={p.id} categoryKey={category.key} label="↑" ariaLabel="เลื่อนขึ้น" />}
                  {i < prompts.length - 1 && <MoveButton action={movePromptDown} id={p.id} categoryKey={category.key} label="↓" ariaLabel="เลื่อนลง" />}
                </div>
                <ActionForm action={savePromptAction} submitLabel="บันทึก prompt">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="categoryKey" value={category.key} />
                  <PromptFields values={promptFormValues({ ...p, badPrompt: p.badPrompt ?? undefined, sourceUrl: p.sourceUrl ?? undefined } as PromptTemplate)} />
                </ActionForm>
                <ActionForm action={deletePromptAction} submitLabel="ลบ prompt นี้" pendingLabel="กำลังลบ…" variant="danger" className="mt-6 border-t border-line pt-4">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="categoryKey" value={category.key} />
                </ActionForm>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-line p-5">
          <h3 className="font-bold">เพิ่ม prompt ใหม่</h3>
          <ActionForm action={savePromptAction} submitLabel="เพิ่ม prompt" className="mt-4" resetOnSuccess>
            <input type="hidden" name="categoryKey" value={category.key} />
            <PromptFields values={{}} />
          </ActionForm>
        </div>
      </section>
    </main>
  );
}
