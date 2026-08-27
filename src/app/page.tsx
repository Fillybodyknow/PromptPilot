import Link from "next/link";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";
import { PhotoAuroraBackground } from "@/components/PhotoAuroraBackground";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const BENEFITS = [
  {
    icon: "⚡",
    title: "เพิ่มประสิทธิภาพการทำงาน",
    description: "ลดเวลาทำงานซ้ำๆ ให้ทีมโฟกัสงานที่สร้างมูลค่าได้มากขึ้น",
  },
  {
    icon: "💰",
    title: "ลดต้นทุนดำเนินงาน",
    description: "อัตโนมัติงานที่ใช้แรงงาน/เวลามาก ลดค่าใช้จ่ายในระยะยาว",
  },
  {
    icon: "🎯",
    title: "ตัดสินใจแม่นยำขึ้น",
    description: "วิเคราะห์ข้อมูลจำนวนมากได้เร็ว ช่วยตัดสินใจบนพื้นฐานข้อมูลจริง",
  },
  {
    icon: "🚀",
    title: "เพิ่มความได้เปรียบทางการแข่งขัน",
    description: "องค์กรที่ปรับใช้ AI เร็วมักตอบสนองตลาดและลูกค้าได้ไวกว่าคู่แข่ง",
  },
  {
    icon: "🧠",
    title: "ปลดปล่อยศักยภาพพนักงาน",
    description: "ให้ AI ช่วยงานซ้ำซาก พนักงานมีเวลาคิดงานเชิงกลยุทธ์มากขึ้น",
  },
  {
    icon: "🤝",
    title: "ยกระดับประสบการณ์ลูกค้า",
    description: "ตอบสนองลูกค้าได้เร็วและตรงจุดขึ้นด้วยผู้ช่วย AI",
  },
];

export default function MainPage() {
  const categories = getAllCategoriesWithEntries();
  const groups = getCategoriesGrouped();
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <PhotoAuroraBackground />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            🤖 ยุคที่ AI เปลี่ยนวิธีทำงานขององค์กรทั่วโลก
          </span>
          <h1
            className="animate-fade-up mt-6 text-4xl leading-tight font-semibold tracking-tight sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            ปลดล็อกศักยภาพองค์กร
            <br />
            ด้วย <span className="text-gradient">AI</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-balance text-lg text-neutral-400"
            style={{ animationDelay: "160ms" }}
          >
            คู่มือเลือกและใช้ AI ที่จำเป็นในองค์กร ครบทั้งวิธีใช้งาน การเขียน prompt
            ที่ได้ผลจริง (มีหลักฐาน) และวิธีติดตั้ง/เข้าถึง — สำหรับองค์กรไทยที่พร้อมก้าวสู่ยุค AI
          </p>
          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/explore"
              className="rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-105 hover:shadow-indigo-500/40"
            >
              เริ่มสำรวจหมวดหมู่ AI →
            </Link>
          </div>

          <div
            className="animate-fade-up mx-auto mt-16 flex max-w-lg items-center justify-center gap-10 text-sm"
            style={{ animationDelay: "320ms" }}
          >
            <div>
              <div className="text-3xl font-semibold text-neutral-50">
                <AnimatedCounter target={groups.length} />
              </div>
              <div className="mt-1 text-neutral-500">กลุ่มงาน</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <div className="text-3xl font-semibold text-neutral-50">
                <AnimatedCounter target={categories.length} />
              </div>
              <div className="mt-1 text-neutral-500">หมวดหมู่</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <div className="text-3xl font-semibold text-neutral-50">
                <AnimatedCounter target={totalTools} />
              </div>
              <div className="mt-1 text-neutral-500">เครื่องมือ</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase">
            ทำไมองค์กรต้องใช้ AI
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
            ประโยชน์ที่จับต้องได้จริง
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.06]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-xl transition-transform group-hover:scale-110">
                {benefit.icon}
              </div>
              <h3 className="mt-4 font-medium text-neutral-100">{benefit.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-400">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/10">
        <PhotoAuroraBackground objectPositionClassName="object-[center_30%]" />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
          <p className="text-2xl font-semibold text-neutral-50 sm:text-3xl">
            พร้อมเริ่มใช้ AI ในองค์กรของคุณแล้วหรือยัง?
          </p>
          <p className="mx-auto mt-3 max-w-md text-neutral-400">
            สำรวจหมวดหมู่ AI ที่จำเป็นในองค์กร พร้อมวิธีใช้งานและติดตั้งแบบละเอียด
          </p>
          <Link
            href="/explore"
            className="mt-7 inline-block rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-105 hover:shadow-indigo-500/40"
          >
            สำรวจหมวดหมู่ AI ทั้งหมด →
          </Link>
        </div>
      </section>
    </>
  );
}
