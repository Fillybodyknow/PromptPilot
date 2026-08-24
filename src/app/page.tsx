import Link from "next/link";
import { getAllCategoriesWithEntries } from "@/lib/data";

export default function HomePage() {
  const categories = getAllCategoriesWithEntries();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold text-neutral-100">
          แนะนำการใช้ AI
        </h1>
        <p className="mt-2 text-neutral-400">
          ฐานข้อมูลเปรียบเทียบเครื่องมือ AI รายหมวด สำหรับผู้ใช้ในประเทศไทย —
          verify date หลัก 24 สิงหาคม 2026
        </p>
        <p className="mt-4 rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          ⚠️ ราคา คะแนน benchmark และสถานะบริการเปลี่ยนแปลงบ่อย — ตรวจซ้ำกับ
          แหล่ง Official ก่อนใช้งานจริงเสมอ
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.key}
            href={`/${category.key}`}
            className="rounded-lg border border-neutral-800 p-5 transition hover:border-neutral-600 hover:bg-neutral-900"
          >
            <h2 className="font-medium text-neutral-100">{category.titleTh}</h2>
            <p className="mt-1 text-sm text-neutral-400">{category.descriptionTh}</p>
            <p className="mt-3 text-xs text-neutral-600">
              {category.entries.length} รายการ
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
