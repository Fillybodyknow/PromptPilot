import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { PageBanner, brandGradientText } from "@/components/site/PageBanner";
import { GroupDot, card } from "@/components/site/ui";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";
import { PAGE_VISUALS, groupVisual } from "@/lib/visuals";

export const metadata: Metadata = {
  title: "คู่มือใช้ AI ตามลักษณะงาน",
  description: "วิธีใช้ AI กับงานแต่ละแบบ prompt ตัวอย่าง ข้อควรระวังเรื่องข้อมูล และเครื่องมือที่ทีมตรวจสอบแล้ว",
};

export default async function GuidesPage() {
  await connection();
  const categories = await getAllCategoriesWithEntries();
  const count = (key: string) => categories.find((c) => c.key === key)?.entries.length ?? 0;

  return (
    <>
      <PageBanner visual={PAGE_VISUALS.guides}>
        <div className="pb-6">
          <h1 className="text-4xl font-bold sm:text-[44px]">
            คู่มือใช้ AI <span className={brandGradientText}>ตามลักษณะงาน</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/85">
            เลือกงานที่คุณทำ เพื่อดูวิธีใช้ AI ที่ได้ผล prompt ตัวอย่าง ข้อมูลที่ห้ามวางลงใน AI และเครื่องมือที่ทีมตรวจสอบแล้ว
          </p>
        </div>
      </PageBanner>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="flex flex-col gap-6">
          {getCategoriesGrouped().map((g) => {
            const visual = groupVisual(g.group);
            return (
              <section key={g.group} aria-labelledby={`g-${g.group}`} className={`${card} reveal group/row flex flex-wrap overflow-hidden`}>
                <div className="relative min-h-44 flex-[1_1_280px] sm:max-w-sm">
                  <Image src={visual.src} alt={visual.alt} fill placeholder="blur" sizes="(min-width: 640px) 384px, 100vw" className="object-cover transition-transform duration-700 group-hover/row:scale-105" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <h2 id={`g-${g.group}`} className="absolute bottom-4 left-5 flex items-center gap-2.5 text-xl font-bold text-white">
                    <GroupDot group={g.group} className="h-2.5 w-2.5 rounded-[3px] ring-2 ring-white/40" />
                    {g.group}
                  </h2>
                </div>
                <div className="flex min-w-0 flex-[2_1_360px] flex-col divide-y divide-line">
                  {g.categories.map((c) => (
                    <Link key={c.key} href={`/guides/${c.key}`} className="group flex flex-1 items-center gap-4 p-5 hover:bg-chip">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-bold group-hover:text-brand">{c.titleTh}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted">{c.descriptionTh}</span>
                        <span className="mt-1.5 block text-[13px] text-muted">{count(c.key)} เครื่องมือ</span>
                      </span>
                      <span aria-hidden className="text-xl text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
