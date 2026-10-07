import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
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
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Link href={`/admin/tools?category=${category.key}`} className="text-sm text-muted hover:text-brand">
        ← กลับไปหมวด{category.titleTh}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">เพิ่มเครื่องมือในหมวด{category.titleTh}</h1>
      <ActionForm action={saveTool} submitLabel="เพิ่มเครื่องมือ" className="mt-6">
        <input type="hidden" name="categoryKey" value={category.key} />
        <ToolFields category={category} values={{ verifiedAt: today }} featured={false} />
      </ActionForm>
    </main>
  );
}
