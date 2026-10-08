import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { PartnersSection } from "@/components/PartnersSection";
import { brandGradientText } from "@/components/site/PageBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { withBasePath } from "@/lib/basePath";
import { msConfigured, msSettings } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/safeNext";
import { getSessionUser } from "@/lib/auth/session";
import { one, type SearchParams } from "@/lib/params";
import { HERO_VISUAL } from "@/lib/visuals";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false, follow: false } };

const NOTICES: Record<string, { tone: "info" | "error"; title: string; body: string }> = {
  "status:pending": {
    tone: "info",
    title: "ส่งคำขอเข้าใช้งานแล้ว",
    body: "บัญชีนี้ไม่ใช่บัญชีพนักงานของบริษัท ต้องรอผู้ดูแลระบบอนุมัติก่อน (อาจมีการติดต่อเพื่อยืนยันตัวตน) เมื่ออนุมัติแล้วกลับมากด “เข้าสู่ระบบด้วย Microsoft” อีกครั้ง",
  },
  "status:full": { tone: "error", title: "ยังรับคำขอเข้าใช้งานเพิ่มไม่ได้", body: "มีคำขอรออนุมัติอยู่มาก ลองใหม่ภายหลัง หรือติดต่อผู้ดูแลระบบ" },
  "status:denied": { tone: "error", title: "บัญชีนี้ไม่ได้รับสิทธิ์เข้าใช้งาน", body: "ถ้าคิดว่าควรได้สิทธิ์ ติดต่อผู้ดูแลระบบ" },
  "error:config": { tone: "error", title: "ยังไม่ได้ตั้งค่า Microsoft login", body: "ผู้ดูแล server ต้องใส่ MS_TENANT_ID, MS_CLIENT_ID และ MS_CLIENT_SECRET ตาม DEPLOY.md" },
  "error:unreachable": { tone: "error", title: "เชื่อมต่อ Microsoft ไม่ได้", body: "ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้ง IT (server ต้องออกไปที่ login.microsoftonline.com ได้)" },
  "error:cancelled": { tone: "info", title: "ยกเลิกการเข้าสู่ระบบแล้ว", body: "กดปุ่มด้านล่างเพื่อลองใหม่" },
  "error:expired": { tone: "error", title: "หมดเวลาเข้าสู่ระบบ", body: "กดปุ่มด้านล่างเพื่อเริ่มใหม่" },
  "error:failed": { tone: "error", title: "เข้าสู่ระบบไม่สำเร็จ", body: "ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้ง IT" },
};

function MicrosoftLogo() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/** จุดเด่นของเว็บที่แสดงฝั่งภาพ — บอกคนที่เพิ่งได้ลิงก์มาว่าเว็บนี้มีอะไร (ข้อความคงที่ ไม่ดึงข้อมูลภายในมาแสดงก่อน login) */
const FEATURES = [
  { icon: "M4 6h16M4 12h16M4 18h10", title: "ข่าว AI ที่คัดมาให้ทุกเช้า", body: "สรุปภาษาไทย พร้อมบอกว่าแต่ละฝ่ายควรทำอะไรต่อ" },
  { icon: "M12 6.25v13M12 6.25C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5s3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25", title: "คู่มือใช้ AI ตามลักษณะงาน", body: "prompt ตัวอย่างที่ใช้ได้ทันที และข้อมูลที่ห้ามวางลงใน AI" },
  { icon: "M9 12l2 2 4-4m5.6-4A11.96 11.96 0 0 1 12 2.94 11.96 11.96 0 0 1 3.4 6 12 12 0 0 0 12 21.06 12 12 0 0 0 20.6 6Z", title: "เครื่องมือที่ทีมตรวจแล้ว", body: "เทียบราคา วิธีเข้าถึง และข้อควรระวังเรื่องข้อมูล" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const next = safeNext(one(sp.next));
  if (await getSessionUser()) redirect(next);

  const status = one(sp.status);
  const error = one(sp.error) ?? (msConfigured() ? undefined : "config");
  const notice = (status && NOTICES[`status:${status}`]) || (error && NOTICES[`error:${error}`]) || null;
  const startHref = withBasePath(`/auth/microsoft/start?next=${encodeURIComponent(next)}`);

  return (
    <main className="grid w-full lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ---------- ฝั่งภาพ: แนะนำเว็บ (จอเล็กเหลือเป็นแถบหัวสั้นๆ) ---------- */}
      <section aria-label="เกี่ยวกับ PromptPilot" className="relative isolate flex min-h-[260px] flex-col overflow-hidden bg-[#0c0d11] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div aria-hidden className="absolute inset-0 -z-20">
          <Image src={HERO_VISUAL.src} alt="" fill priority placeholder="blur" sizes="(min-width: 1024px) 55vw, 100vw" className="ken-burns object-cover" />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0c0d11]/95 via-[#0c0d11]/80 to-indigo-950/70" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden mix-blend-screen">
          <div className="orb absolute -left-[15%] top-[10%] h-[45%] w-[55%] rounded-full bg-indigo-600/40 blur-3xl" />
          <div className="orb absolute bottom-[5%] right-[-10%] h-[45%] w-[50%] rounded-full bg-fuchsia-600/30 blur-3xl [animation-delay:-7s]" />
        </div>

        <div className="fade-up flex items-center gap-3">
          <Image src={withBasePath("/images/app/app_logo.png")} alt="" width={40} height={40} className="h-10 w-10 rounded-xl" unoptimized />
          <span className="text-xl font-bold tracking-tight">PromptPilot</span>
        </div>

        <div className="mt-8 flex flex-1 flex-col justify-center lg:mt-0">
          <h2 style={{ animationDelay: "100ms" }} className="fade-up max-w-xl text-[28px] font-bold leading-tight sm:text-4xl lg:text-[44px]">
            ข่าว AI ที่<span className={brandGradientText}>องค์กรต้องรู้</span>
            <br className="hidden sm:block" /> และคู่มือใช้ AI ในงานของคุณ
          </h2>
          <ul className="mt-10 hidden flex-col gap-6 lg:flex">
            {FEATURES.map((f, i) => (
              <li key={f.title} style={{ animationDelay: `${200 + i * 100}ms` }} className="fade-up flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </span>
                <span>
                  <span className="block text-lg font-semibold">{f.title}</span>
                  <span className="mt-0.5 block text-[15px] leading-relaxed text-white/70">{f.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 hidden flex-col gap-3 lg:flex">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">บริษัทในเครือ</span>
          <PartnersSection />
        </div>
      </section>

      {/* ---------- ฝั่งเข้าสู่ระบบ ---------- */}
      <section className="relative flex flex-col bg-background px-6 py-8 sm:px-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div style={{ animationDelay: "150ms" }} className="fade-up">
            <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
            <p className="mt-2 leading-relaxed text-muted">เว็บนี้ใช้ได้เฉพาะคนในบริษัท เข้าสู่ระบบด้วยบัญชี Microsoft 365 ของคุณ</p>
          </div>

          {notice && (
            <div role="status" className={`fade-up mt-6 rounded-2xl px-4 py-3.5 ${notice.tone === "error" ? "bg-urgent-bg text-urgent" : "bg-brand-soft text-brand"}`}>
              <p className="font-semibold">{notice.title}</p>
              <p className="mt-1 text-sm leading-relaxed">{notice.body}</p>
            </div>
          )}

          {/* ลิงก์ธรรมดา (ไม่ใช่ next/link) — ไม่ให้ prefetch route ที่สร้าง state และส่งออกไป Microsoft */}
          <a
            href={startHref}
            style={{ animationDelay: "250ms" }}
            className="fade-up group mt-8 flex h-14 items-center justify-center gap-3 rounded-2xl border border-line bg-surface text-[17px] font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <MicrosoftLogo />
            เข้าสู่ระบบด้วย Microsoft
            <span aria-hidden className="text-muted transition-transform group-hover:translate-x-1">→</span>
          </a>

          <p style={{ animationDelay: "350ms" }} className="fade-up mt-6 text-sm leading-relaxed text-muted">
            {msSettings().allowExternal
              ? "พนักงานเข้าใช้ได้ทันที บัญชีภายนอก (องค์กรอื่นหรือบัญชีส่วนตัว) ต้องรอผู้ดูแลระบบอนุมัติ"
              : "พนักงานเข้าใช้ได้ทันที บัญชีจากภายนอกบริษัทเข้าไม่ได้"}
          </p>
        </div>
        <p className="text-center text-xs text-muted">เข้าสู่ระบบไม่ได้ ติดต่อฝ่าย IT ของบริษัท</p>
      </section>
    </main>
  );
}
