import Link from "next/link";
import { NAV_ITEMS } from "./nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-muted sm:px-6">
        <div className="flex flex-wrap justify-between gap-4">
          <p className="max-w-2xl leading-relaxed">
            ราคา คะแนน benchmark และสถานะบริการเปลี่ยนบ่อย ตรวจซ้ำกับแหล่ง Official ก่อนใช้งานจริงเสมอ
            และห้ามวางข้อมูลอ่อนไหวขององค์กรลงในเครื่องมือใดๆ โดยไม่ผ่านนโยบายความปลอดภัยข้อมูล
          </p>
          <nav aria-label="ลิงก์ท้ายเว็บ" className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
