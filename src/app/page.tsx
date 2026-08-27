import Link from "next/link";
import Image from "next/image";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";
import { PartnersSection } from "@/components/PartnersSection";

const GROUP_ICON: Record<string, string> = {
  ผู้ช่วยทั่วไป: "💬",
  งานเอกสาร: "📄",
  งานพัฒนาระบบ: "💻",
  งานข้อมูล: "📊",
  งานออกแบบ: "🎨",
  งานสื่อสาร: "🎙️",
  งานระบบ: "⚙️",
};

export default function HomePage() {
  const categories = getAllCategoriesWithEntries();
  const groups = getCategoriesGrouped();
  const entryCount = (key: string) =>
    categories.find((c) => c.key === key)?.entries.length ?? 0;
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <>
      {/* Hero — full-bleed background photo, scrim + fade so it blends into the page below */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/app/backgrounds/4.png"
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/88 dark:bg-neutral-950/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-neutral-950" />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            ✨ อัปเดตล่าสุด 25 สิงหาคม 2026
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">
            แนะนำการใช้ AI ในองค์กร
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-neutral-600 dark:text-neutral-400">
            หมวดหมู่ AI ที่จำเป็นในองค์กร พร้อมวิธีใช้งาน การเขียน prompt ที่ได้ผลจริง
            (มีหลักฐาน) และวิธีติดตั้ง/เข้าถึงแบบละเอียดต่อเครื่องมือ
          </p>

          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-8 text-sm">
            <div>
              <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                {groups.length}
              </div>
              <div className="text-neutral-500 dark:text-neutral-500">กลุ่มงาน</div>
            </div>
            <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />
            <div>
              <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                {categories.length}
              </div>
              <div className="text-neutral-500 dark:text-neutral-500">หมวดหมู่</div>
            </div>
            <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />
            <div>
              <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                {totalTools}
              </div>
              <div className="text-neutral-500 dark:text-neutral-500">เครื่องมือ</div>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            ⚠️ ราคา คะแนน benchmark และสถานะบริการเปลี่ยนแปลงบ่อย — ตรวจซ้ำกับแหล่ง
            Official ก่อนใช้งานจริงเสมอ และห้ามวางข้อมูลอ่อนไหวขององค์กรลงในเครื่องมือใดๆ
            โดยไม่ผ่านนโยบายความปลอดภัยข้อมูล
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-14 sm:pb-20">
        <PartnersSection />

        {/* Category groups */}
        {groups.map((group) => (
          <div key={group.group} className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-500">
              <span aria-hidden>{GROUP_ICON[group.group] ?? "🔹"}</span>
              {group.group}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.categories.map((category) => (
                <Link
                  key={category.key}
                  href={`/${category.key}`}
                  className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-indigo-800"
                >
                  <h3 className="font-medium text-neutral-900 group-hover:text-indigo-600 dark:text-neutral-100 dark:group-hover:text-indigo-400">
                    {category.titleTh}
                  </h3>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {category.descriptionTh}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 dark:text-neutral-600">
                    {entryCount(category.key)} รายการ
                    <span className="text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                      →
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
