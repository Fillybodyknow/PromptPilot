import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { card, GroupDot } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { loadAllGuides } from "@/lib/catalog/repo";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = { title: "จัดการคู่มือและ prompt" };

export default async function AdminGuidesPage() {
  await requireAdminPage();
  const guides = await loadAllGuides();

  return (
    <AdminPage title="คู่มือและ prompt" description="เลือกหมวดเพื่อแก้คู่มือการใช้ AI และ prompt ตัวอย่างของหมวดนั้น">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map((c) => {
          const g = guides[c.key];
          const prompts = (g?.promptTemplates as unknown[] | undefined)?.length ?? 0;
          return (
            <Link key={c.key} href={`/admin/guides/${c.key}`} className={`${card} flex min-w-0 flex-col gap-1 p-5 transition-colors hover:border-ink`}>
              <span className="flex items-center gap-2 font-bold">
                <GroupDot group={c.group} />
                {c.titleTh}
              </span>
              <span className={`text-sm ${g ? "text-muted" : "font-semibold text-warn"}`}>{g ? `prompt ตัวอย่าง ${prompts} ตัว` : "ยังไม่มีคู่มือ"}</span>
            </Link>
          );
        })}
      </div>
    </AdminPage>
  );
}
