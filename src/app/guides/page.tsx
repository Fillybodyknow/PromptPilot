import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { GroupDot, card } from "@/components/site/ui";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";

export const metadata: Metadata = {
  title: "คู่มือใช้ AI ตามลักษณะงาน",
  description: "วิธีใช้ AI กับงานแต่ละแบบ prompt ตัวอย่าง ข้อควรระวังเรื่องข้อมูล และเครื่องมือที่ทีมตรวจสอบแล้ว",
};

export default async function GuidesPage() {
  await connection();
  const categories = await getAllCategoriesWithEntries();
  const count = (key: string) => categories.find((c) => c.key === key)?.entries.length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-[32px] font-bold">คู่มือใช้ AI ตามลักษณะงาน</h1>
      <p className="mt-2 max-w-3xl leading-relaxed text-muted">
        เลือกงานที่คุณทำ เพื่อดูวิธีใช้ AI ที่ได้ผล prompt ตัวอย่าง ข้อมูลที่ห้ามวางลงใน AI และเครื่องมือที่ทีมตรวจสอบแล้ว
      </p>
      <div className="mt-8 flex flex-col gap-8">
        {getCategoriesGrouped().map((g) => (
          <section key={g.group} aria-labelledby={`g-${g.group}`}>
            <h2 id={`g-${g.group}`} className="flex items-center gap-2.5 text-xl font-bold">
              <GroupDot group={g.group} className="h-2.5 w-2.5 rounded-[3px]" />
              {g.group}
            </h2>
            <div className="mt-3.5 flex flex-wrap gap-4">
              {g.categories.map((c) => (
                <Link key={c.key} href={`/guides/${c.key}`} className={`${card} flex min-w-0 flex-[1_1_320px] flex-col gap-1.5 p-5 hover:border-ink`}>
                  <span className="text-[17px] font-bold">{c.titleTh}</span>
                  <span className="text-sm leading-relaxed text-muted">{c.descriptionTh}</span>
                  <span className="mt-1 text-[13px] text-muted">{count(c.key)} เครื่องมือ</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
