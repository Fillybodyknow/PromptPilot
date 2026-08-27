import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/30 light:border-black/10 light:bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-neutral-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>แนะนำการใช้ AI — ฐานข้อมูลเปรียบเทียบเครื่องมือ AI รายหมวด สำหรับผู้ใช้ในประเทศไทย</p>
          <div className="flex gap-4 text-neutral-400 light:text-neutral-500">
            <Link
              href="/"
              className="transition-colors hover:text-white light:hover:text-neutral-900"
            >
              หน้าแรก
            </Link>
            <Link
              href="/explore"
              className="transition-colors hover:text-white light:hover:text-neutral-900"
            >
              สำรวจหมวดหมู่
            </Link>
          </div>
        </div>
        <p className="mt-4">
          ⚠️ ราคา คะแนน benchmark และสถานะบริการเปลี่ยนแปลงบ่อย — ตรวจซ้ำกับแหล่ง Official
          ก่อนใช้งานจริงเสมอ ห้ามวางข้อมูลอ่อนไหวขององค์กรลงในเครื่องมือใดๆ
          โดยไม่ผ่านนโยบายความปลอดภัยข้อมูล
        </p>
      </div>
    </footer>
  );
}
