import Link from "next/link";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";
import { HeroBackgroundSlideshow } from "@/components/HeroBackgroundSlideshow";

const GROUP_ICON: Record<string, string> = {
  ผู้ช่วยทั่วไป: "💬",
  งานเอกสาร: "📄",
  งานพัฒนาระบบ: "💻",
  งานข้อมูล: "📊",
  งานออกแบบ: "🎨",
  งานสื่อสาร: "🎙️",
  งานระบบ: "⚙️",
};

export default function ExplorePage() {
  const categories = getAllCategoriesWithEntries();
  const groups = getCategoriesGrouped();
  const entryCount = (key: string) =>
    categories.find((c) => c.key === key)?.entries.length ?? 0;
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <>
      {/* Hero — cross-fading background photo carousel, scrim + fade so it blends into the page below */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <HeroBackgroundSlideshow />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08070c]" />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-14 text-center sm:py-20">
          <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            ✨ อัปเดตล่าสุด 25 สิงหาคม 2026
          </span>
          <h1
            className="animate-fade-up mt-5 text-4xl font-semibold tracking-tight text-neutral-50 sm:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            สำรวจหมวดหมู่ AI ทั้งหมด
          </h1>
          <p
            className="animate-fade-up mx-auto mt-4 max-w-2xl text-balance text-neutral-400"
            style={{ animationDelay: "160ms" }}
          >
            หมวดหมู่ AI ที่จำเป็นในองค์กร พร้อมวิธีใช้งาน การเขียน prompt ที่ได้ผลจริง
            (มีหลักฐาน) และวิธีติดตั้ง/เข้าถึงแบบละเอียดต่อเครื่องมือ
          </p>

          <div
            className="animate-fade-up mx-auto mt-8 flex max-w-md items-center justify-center gap-8 text-sm"
            style={{ animationDelay: "240ms" }}
          >
            <div>
              <div className="text-2xl font-semibold text-neutral-50">{groups.length}</div>
              <div className="text-neutral-500">กลุ่มงาน</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-2xl font-semibold text-neutral-50">{categories.length}</div>
              <div className="text-neutral-500">หมวดหมู่</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-2xl font-semibold text-neutral-50">{totalTools}</div>
              <div className="text-neutral-500">เครื่องมือ</div>
            </div>
          </div>

          <p
            className="animate-fade-up mx-auto mt-8 max-w-2xl rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-300"
            style={{ animationDelay: "320ms" }}
          >
            ⚠️ ราคา คะแนน benchmark และสถานะบริการเปลี่ยนแปลงบ่อย — ตรวจซ้ำกับแหล่ง
            Official ก่อนใช้งานจริงเสมอ และห้ามวางข้อมูลอ่อนไหวขององค์กรลงในเครื่องมือใดๆ
            โดยไม่ผ่านนโยบายความปลอดภัยข้อมูล
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-14 sm:pb-20">
        {/* Category groups */}
        {groups.map((group) => (
          <div key={group.group} className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
              <span aria-hidden>{GROUP_ICON[group.group] ?? "🔹"}</span>
              {group.group}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.categories.map((category) => (
                <Link
                  key={category.key}
                  href={`/${category.key}`}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[0.06]"
                >
                  <h3 className="font-medium text-neutral-100 transition-colors group-hover:text-indigo-300">
                    {category.titleTh}
                  </h3>
                  <p className="mt-1.5 text-sm text-neutral-400">{category.descriptionTh}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
                    {entryCount(category.key)} รายการ
                    <span className="text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
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
