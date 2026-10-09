import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminPage } from "@/components/admin/AdminPage";
import { ToolFields } from "@/components/admin/ToolFields";
import { requireAdminPage } from "@/lib/adminSession";
import { getCategory } from "@/lib/categories";
import { newToolPrefill } from "@/lib/content/apply";
import { one, type SearchParams } from "@/lib/params";
import { saveTool } from "../actions";

export const metadata: Metadata = { title: "เพิ่มเครื่องมือ" };

export default async function NewToolPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const category = getCategory(one(sp.category) ?? "");
  if (!category) notFound();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  // มาจากปุ่ม "สร้างเครื่องมือจากข้อเสนอนี้" — กรอกส่วนที่ AI เสนอไว้ให้ (ข้อเสนอต้องยังรอตรวจและเป็นของหมวดนี้)
  const suggestionId = Number(one(sp.suggestion));
  const prefill = Number.isInteger(suggestionId) && suggestionId > 0 ? await newToolPrefill(suggestionId, category.key) : null;

  return (
    <AdminPage
      width="narrow"
      back={{ href: prefill ? "/admin/suggestions?type=new_tool" : `/admin/tools?category=${category.key}`, label: prefill ? "ข้อเสนอเครื่องมือใหม่" : `เครื่องมือหมวด${category.titleTh}` }}
      title={`เพิ่มเครื่องมือในหมวด${category.titleTh}`}
      description={
        prefill
          ? "กรอกชื่อ ผู้ให้บริการ ลิงก์ และสรุปจากข้อเสนอของ AI ไว้ให้แล้ว — ตรวจกับเว็บทางการ แล้วกรอกช่องที่เหลือ (*) · บันทึกแล้วข้อเสนอจะปิดเอง"
          : "ช่องที่มี * ต้องกรอก · เพิ่มแล้วแสดงบนหน้าเว็บทันที"
      }
    >
      <ActionForm action={saveTool} submitLabel="เพิ่มเครื่องมือ">
        <input type="hidden" name="categoryKey" value={category.key} />
        {prefill && <input type="hidden" name="fromSuggestion" value={suggestionId} />}
        <ToolFields
          category={category}
          values={{ verifiedAt: today, ...(prefill ? { name: prefill.name, vendor: prefill.vendor, url: prefill.url, summary: prefill.summary } : {}) }}
          featured={false}
        />
      </ActionForm>
    </AdminPage>
  );
}
