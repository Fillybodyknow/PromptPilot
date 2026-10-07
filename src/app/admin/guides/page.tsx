import type { Metadata } from "next";
import Link from "next/link";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { loadAllGuides } from "@/lib/catalog/repo";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = { title: "จัดการคู่มือและ prompt" };

export default async function AdminGuidesPage() {
  await requireAdminPage();
  const guides = await loadAllGuides();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold">จัดการคู่มือและ prompt</h1>
      <p className="mt-1 text-sm text-muted">เลือกหมวดเพื่อแก้คู่มือและ prompt ตัวอย่าง</p>
      <div className="mt-6 flex flex-wrap gap-4">
        {CATEGORIES.map((c) => {
          const g = guides[c.key];
          const prompts = (g?.promptTemplates as unknown[] | undefined)?.length ?? 0;
          return (
            <Link key={c.key} href={`/admin/guides/${c.key}`} className={`${card} flex min-w-0 flex-[1_1_300px] flex-col gap-1 p-5 hover:border-ink`}>
              <span className="font-bold">{c.titleTh}</span>
              <span className="text-sm text-muted">{g ? `prompt ${prompts} ตัว` : "ยังไม่มีคู่มือ"}</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
