import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminPage } from "@/components/admin/AdminPage";
import { ToolFields } from "@/components/admin/ToolFields";
import { requireAdminPage } from "@/lib/adminSession";
import { getCategory } from "@/lib/categories";
import { one, type SearchParams } from "@/lib/params";
import { saveTool } from "../actions";

export const metadata: Metadata = { title: "เพิ่มเครื่องมือ" };

export default async function NewToolPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const category = getCategory(one((await searchParams).category) ?? "");
  if (!category) notFound();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

  return (
    <AdminPage
      width="narrow"
      back={{ href: `/admin/tools?category=${category.key}`, label: `เครื่องมือหมวด${category.titleTh}` }}
      title={`เพิ่มเครื่องมือในหมวด${category.titleTh}`}
      description="ช่องที่มี * ต้องกรอก · เพิ่มแล้วแสดงบนหน้าเว็บทันที"
    >
      <ActionForm action={saveTool} submitLabel="เพิ่มเครื่องมือ">
        <input type="hidden" name="categoryKey" value={category.key} />
        <ToolFields category={category} values={{ verifiedAt: today }} featured={false} />
      </ActionForm>
    </AdminPage>
  );
}
