import Link from "next/link";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";

export default function HomePage() {
  const categories = getAllCategoriesWithEntries();
  const groups = getCategoriesGrouped();
  const entryCount = (key: string) =>
    categories.find((c) => c.key === key)?.entries.length ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold text-neutral-100">
          แนะนำการใช้ AI ในองค์กร
        </h1>
        <p className="mt-2 text-neutral-400">
          หมวดหมู่ AI ที่จำเป็นในองค์กร พร้อมวิธีใช้งาน การเขียน prompt ที่ได้ผล
          และวิธีติดตั้ง/เข้าถึง — verify date หลัก 24 สิงหาคม 2026
        </p>
        <p className="mt-4 rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          ⚠️ ราคา คะแนน benchmark และสถานะบริการเปลี่ยนแปลงบ่อย — ตรวจซ้ำกับ
          แหล่ง Official ก่อนใช้งานจริงเสมอ และห้ามวางข้อมูลอ่อนไหวขององค์กร
          ลงในเครื่องมือใดๆ โดยไม่ผ่านนโยบายความปลอดภัยข้อมูล
        </p>
      </header>

      {groups.map((group) => (
        <div key={group.group} className="mb-10">
          <h2 className="mb-3 text-sm font-medium tracking-wide text-neutral-500 uppercase">
            {group.group}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.categories.map((category) => (
              <Link
                key={category.key}
                href={`/${category.key}`}
                className="rounded-lg border border-neutral-800 p-5 transition hover:border-neutral-600 hover:bg-neutral-900"
              >
                <h3 className="font-medium text-neutral-100">{category.titleTh}</h3>
                <p className="mt-1 text-sm text-neutral-400">{category.descriptionTh}</p>
                <p className="mt-3 text-xs text-neutral-600">
                  {entryCount(category.key)} รายการ
                </p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
