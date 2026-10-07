import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { ToolFields } from "@/components/admin/ToolFields";
import { requireAdminPage } from "@/lib/adminSession";
import { getToolRow } from "@/lib/catalog/admin";
import { toolFormValues } from "@/lib/catalog/forms";
import { loadAllEntries } from "@/lib/catalog/repo";
import { getCategory } from "@/lib/categories";
import { one, type SearchParams } from "@/lib/params";
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

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Link href={`/admin/tools?category=${category.key}`} className="text-sm text-muted hover:text-brand">
        ← กลับไปหมวด{category.titleTh}
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{row.name}</h1>
        <Link href={`/tools/${category.key}/${row.slug}`} className="text-sm font-semibold text-brand hover:underline">
          ดูหน้าเว็บ →
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        หมวด{category.titleTh} (ย้ายหมวดไม่ได้ ถ้าต้องการให้เพิ่มใหม่ในหมวดที่ถูกแล้วลบตัวนี้)
      </p>
      {created && <p className="mt-4 rounded-xl bg-good-bg px-4 py-3 text-sm text-good">เพิ่มเครื่องมือแล้ว และแสดงบนหน้าเว็บแล้ว</p>}

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
    </main>
  );
}
