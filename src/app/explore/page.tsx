import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";

export default function ExploreOverviewPage() {
  const categories = getAllCategoriesWithEntries();
  const groups = getCategoriesGrouped();
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <div className="animate-fade-up">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
        ✨ อัปเดตล่าสุด 25 สิงหาคม 2026
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
        สำรวจหมวดหมู่ AI ทั้งหมด
      </h1>
      <p className="mt-2 max-w-xl text-neutral-400">
        เลือกหมวดหมู่จากเมนูด้านซ้าย (หรือแถบเลื่อนด้านบนบนมือถือ) เพื่อดูวิธีใช้งาน
        การเขียน prompt ที่ได้ผลจริง (มีหลักฐาน) และวิธีติดตั้ง/เข้าถึงเครื่องมือแนะนำแบบละเอียด
      </p>

      <div className="mt-8 flex flex-wrap gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div>
          <div className="text-2xl font-semibold text-neutral-50">{groups.length}</div>
          <div className="text-sm text-neutral-500">กลุ่มงาน</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-neutral-50">{categories.length}</div>
          <div className="text-sm text-neutral-500">หมวดหมู่</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-neutral-50">{totalTools}</div>
          <div className="text-sm text-neutral-500">เครื่องมือ</div>
        </div>
      </div>

      <p className="mt-6 max-w-2xl rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
        ⚠️ ราคา คะแนน benchmark และสถานะบริการเปลี่ยนแปลงบ่อย — ตรวจซ้ำกับแหล่ง Official
        ก่อนใช้งานจริงเสมอ และห้ามวางข้อมูลอ่อนไหวขององค์กรลงในเครื่องมือใดๆ
        โดยไม่ผ่านนโยบายความปลอดภัยข้อมูล
      </p>
    </div>
  );
}
