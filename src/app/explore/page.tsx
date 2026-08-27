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
  // Per-group starting index (pure, no mutation) so the fade-up stagger continues
  // smoothly across group boundaries instead of resetting to 0 at the start of every group.
  const groupStartIndex = groups.map((_, gi) =>
    groups.slice(0, gi).reduce((sum, g) => sum + g.categories.length, 0)
  );

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

          <div
            className="animate-fade-up mt-10 flex justify-center text-neutral-600"
            style={{ animationDelay: "400ms" }}
            aria-hidden
          >
            <span className="animate-bounce text-xl">↓</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-14 sm:pb-20">
        {/* Category groups */}
        {groups.map((group, groupIdx) => {
          const startIndex = groupStartIndex[groupIdx];
          return (
            <div key={group.group} className="mb-14">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-lg">
                  {GROUP_ICON[group.group] ?? "🔹"}
                </span>
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-neutral-200 uppercase">
                    {group.group}
                  </h2>
                  <div className="mt-1 h-px w-16 bg-gradient-to-r from-indigo-500/60 to-transparent" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.categories.map((category, i) => (
                  <Link
                    key={category.key}
                    href={`/${category.key}`}
                    className="animate-fade-up group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-950/40"
                    style={{ animationDelay: `${(startIndex + i) * 50}ms` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-transform duration-300 group-hover:scale-x-100" />
                    <h3 className="font-medium text-neutral-100 transition-colors group-hover:text-indigo-300">
                      {category.titleTh}
                    </h3>
                    <p className="mt-1.5 text-sm text-neutral-400">{category.descriptionTh}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-neutral-500">
                        {entryCount(category.key)} รายการ
                      </span>
                      <span className="text-indigo-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}
