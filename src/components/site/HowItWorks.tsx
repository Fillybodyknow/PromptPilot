"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { VendorLogo } from "@/components/VendorLogo";

export interface HowGroup {
  name: string;
  /** class สีจุดประจำกลุ่ม (จาก getGroupAccent ฝั่ง server) */
  dot: string;
}
export interface HowTool {
  name: string;
  vendor: string;
}
export interface HowNews {
  title: string;
  importance: number | null;
}

/** ความยาว scroll ต่อ 1 ขั้น (หน่วย vh) — ยิ่งมากยิ่งต้องเลื่อนนานกว่าจะเปลี่ยนขั้น */
const STEP_VH = 70;

/**
 * "เริ่มใช้ AI ในงานของคุณใน 4 ขั้น" แบบ scrollytelling (คล้ายหน้า aipass.go.th):
 * จอใหญ่ — ทั้งส่วนค้างอยู่กับที่ (sticky) ระหว่างเลื่อน มือถือจำลองฝั่งซ้ายเปลี่ยนหน้าจอตามขั้น
 * รายการขั้นตอนฝั่งขวาไฮไลต์ขั้นปัจจุบัน ขั้นอื่นจางและเบลอ คลิกขั้นไหนก็เลื่อนไปขั้นนั้น
 * จอเล็ก — แสดงทุกขั้นเรียงลงมาพร้อมหน้าจอของแต่ละขั้น (จอเตี้ยเกินกว่าจะค้างทั้งส่วนได้)
 */
export function HowItWorks({ groups, tools, news }: { groups: HowGroup[]; tools: HowTool[]; news: HowNews[] }) {
  const steps: { title: string; body: string; hint: string; links: { href: string; label: string }[]; screen: ReactNode }[] = [
    {
      title: "เลือกงานที่คุณทำ",
      body: "คู่มือแยกตามลักษณะงาน 7 กลุ่ม ตั้งแต่งานเอกสาร งานข้อมูล ไปจนถึงงานพัฒนาระบบ เริ่มจากงานที่ทำทุกวันก่อน",
      hint: "แตะกลุ่มงานของคุณ",
      links: [{ href: "/guides", label: "ดูคู่มือทั้งหมด" }],
      screen: <ScreenGroups groups={groups} />,
    },
    {
      title: "คัดลอก prompt ตัวอย่างไปใช้",
      body: "ทุกคู่มือมี prompt ที่เทียบให้เห็นแบบที่ได้ผลไม่ดีกับแบบที่แนะนำ กดคัดลอกแล้ววางในเครื่องมือ AI ได้ทันที",
      hint: "กดคัดลอก แล้ววางในแชต AI",
      links: [{ href: "/guides/general-assistant?tab=prompts", label: "ลองดู prompt ตัวอย่าง" }],
      screen: <ScreenPrompt />,
    },
    {
      title: "เลือกเครื่องมือที่ทีมตรวจแล้ว",
      body: "เทียบราคา วิธีเข้าถึง และข้อควรระวังเรื่องข้อมูลของแต่ละเครื่องมือ ทุกรายการมีแหล่งอ้างอิงและวันที่ตรวจล่าสุด",
      hint: "เทียบราคาและวิธีเข้าถึง",
      links: [
        { href: "/tools", label: "ดูเครื่องมือทั้งหมด" },
        { href: "/tools?access=self-host", label: "แบบติดตั้งเองในองค์กร" },
      ],
      screen: <ScreenTools tools={tools} />,
    },
    {
      title: "ติดตามข่าวที่กระทบองค์กร",
      body: "AI คัดข่าวทุกเช้า ทีมตรวจก่อนเผยแพร่ พร้อมบอกว่าพนักงาน ฝ่าย IT และผู้บริหารควรทำอะไรต่อ",
      hint: "อ่านว่าองค์กรต้องทำอะไรต่อ",
      links: [
        { href: "/news", label: "อ่านข่าววันนี้" },
        { href: "/news?importance=3", label: "เฉพาะข่าวด่วน" },
      ],
      screen: <ScreenNews news={news} />,
    },
  ];

  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // ขั้นปัจจุบันคิดจากว่าเลื่อนผ่านส่วนนี้ไปแล้วกี่ % (เฉพาะจอใหญ่ที่ส่วนนี้ค้างอยู่กับที่)
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = wrapRef.current;
      if (!el || el.offsetParent === null) return; // ซ่อนอยู่ (จอเล็ก)
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = Math.min(Math.max(-rect.top / total, 0), 0.9999);
      setActive(Math.floor(progress * steps.length));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps.length]);

  const goTo = useCallback(
    (i: number) => {
      const el = wrapRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY + ((i + 0.5) / steps.length) * total;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    },
    [steps.length],
  );

  const heading = (
    <div className="text-center">
      <h2 id="how" className="text-[26px] font-bold sm:text-[32px]">
        เริ่มใช้ AI ในงานของคุณ <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">ใน 4 ขั้น</span>
      </h2>
      <p className="mt-2 text-muted">ไม่ต้องรู้เทคนิค ทุกอย่างคัดและตรวจมาให้แล้ว</p>
    </div>
  );

  return (
    <section aria-labelledby="how" className="mt-20">
      {/* จอใหญ่: ค้างอยู่กับที่ระหว่างเลื่อน */}
      <div ref={wrapRef} className="relative hidden lg:block" style={{ height: `${100 + (steps.length - 1) * STEP_VH}vh` }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center gap-8 py-16">
          {heading}
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-12 px-6">
            <div className="relative flex flex-col items-center gap-4">
              <Phone>
                {steps.map((s, i) => (
                  <div
                    key={s.title}
                    aria-hidden={i !== active}
                    className={`absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none ${
                      i === active ? "translate-y-0 scale-100 opacity-100" : i < active ? "-translate-y-6 scale-95 opacity-0" : "translate-y-6 scale-95 opacity-0"
                    }`}
                  >
                    {s.screen}
                  </div>
                ))}
              </Phone>
              {/* ป้ายบอกว่าต้องทำอะไรบนหน้าจอนี้ — เหมือนป้ายชี้ของ aipass */}
              <div key={active} className="fade-up absolute -right-4 bottom-24 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-brand shadow-xl shadow-black/15">
                <CursorIcon />
                {steps[active].hint}
              </div>
              <div className="flex gap-2" aria-hidden>
                {steps.map((s, i) => (
                  <span key={s.title} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-brand" : "w-1.5 bg-line"}`} />
                ))}
              </div>
            </div>

            <ol className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-xl shadow-black/5">
              {steps.map((s, i) => {
                const on = i === active;
                return (
                  <li
                    key={s.title}
                    aria-current={on ? "step" : undefined}
                    className={`rounded-2xl transition-all duration-500 motion-reduce:transition-none ${on ? "bg-brand-soft" : "opacity-45 blur-[1.5px] hover:opacity-80 hover:blur-none"}`}
                  >
                    <button type="button" onClick={() => goTo(i)} className="flex w-full items-baseline gap-4 px-6 pt-5 text-left">
                      <span className={`text-xl font-bold ${on ? "text-brand" : "text-muted"}`}>{i + 1}</span>
                      <span className="text-xl font-bold">{s.title}</span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-500 motion-reduce:transition-none ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="px-6 pb-6 pl-[3.25rem]">
                          <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {s.links.map((l) => (
                              <Link
                                key={l.href}
                                href={l.href}
                                tabIndex={on ? undefined : -1}
                                className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold shadow-sm transition hover:border-brand hover:text-brand"
                              >
                                {l.label} <span aria-hidden>→</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!on && <div className="pb-5" />}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* จอเล็ก: ทุกขั้นเรียงลงมา */}
      <div className="px-4 sm:px-6 lg:hidden">
        {heading}
        <ol className="mt-8 flex flex-col gap-10">
          {steps.map((s, i) => (
            <li key={s.title} className="reveal flex flex-col items-center gap-5">
              <div className="w-full">
                <div className="flex items-baseline gap-3">
                  <span className="text-xl font-bold text-brand">{i + 1}</span>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                </div>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </div>
              <Phone small>{s.screen}</Phone>
              <div className="flex flex-wrap justify-center gap-2">
                {s.links.map((l) => (
                  <Link key={l.href} href={l.href} className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold">
                    {l.label} <span aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- มือถือจำลองและหน้าจอแต่ละขั้น

function Phone({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <div className={`relative rounded-[2.6rem] bg-[#0c0d11] p-2.5 shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10 ${small ? "h-[480px] w-[250px]" : "h-[min(560px,62vh)] w-[min(290px,32vh)]"}`}>
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-background">
        <div aria-hidden className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0c0d11]" />
        <div className="relative h-full w-full">{children}</div>
      </div>
    </div>
  );
}

function ScreenTop({ title }: { title: string }) {
  return (
    <div className="border-b border-line bg-surface px-4 pb-3 pt-10">
      <p className="text-[10px] font-bold text-brand">PromptPilot</p>
      <p className="text-[15px] font-bold leading-snug">{title}</p>
    </div>
  );
}

function ScreenGroups({ groups }: { groups: HowGroup[] }) {
  return (
    <div className="h-full">
      <ScreenTop title="คุณทำงานแบบไหน?" />
      <div className="grid grid-cols-2 gap-2 p-3">
        {groups.map((g, i) => (
          <div
            key={g.name}
            className={`flex items-center gap-2 rounded-xl border bg-surface px-2.5 py-3 text-[11px] font-semibold ${i === 1 ? "border-brand ring-2 ring-brand/40" : "border-line"}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${g.dot}`} />
            <span className="min-w-0 truncate">{g.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenPrompt() {
  return (
    <div className="h-full">
      <ScreenTop title="สรุปรายงานการประชุม" />
      <div className="flex flex-col gap-2.5 p-3 text-[11px] leading-relaxed">
        <div className="rounded-xl bg-urgent-bg p-2.5">
          <p className="font-bold text-urgent">แบบที่ได้ผลไม่ดี</p>
          <p className="mt-0.5">สรุปประชุมให้หน่อย</p>
        </div>
        <div className="rounded-xl bg-good-bg p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-good">แบบที่แนะนำ</p>
            <span className="pop rounded-md border border-emerald-500/50 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-good">✓ คัดลอกแล้ว</span>
          </div>
          <p className="mt-1">
            คุณคือเลขานุการทีม สรุปบันทึกประชุมด้านล่างเป็น 3 ส่วน: สิ่งที่ตัดสินใจแล้ว, งานที่ต้องทำพร้อมผู้รับผิดชอบและกำหนดส่ง, เรื่องที่ยังค้าง
            ใช้ภาษาสุภาพ ไม่เกินครึ่งหน้า
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-line p-2.5 text-muted">ห้ามวางข้อมูลลูกค้าหรือเอกสารลับลงในเครื่องมือที่องค์กรยังไม่อนุมัติ</div>
      </div>
    </div>
  );
}

function ScreenTools({ tools }: { tools: HowTool[] }) {
  return (
    <div className="h-full">
      <ScreenTop title="เครื่องมือที่ทีมตรวจแล้ว" />
      <div className="flex flex-col gap-2 p-3">
        {tools.slice(0, 4).map((t) => (
          <div key={t.name} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5">
            <VendorLogo vendor={t.vendor} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold">{t.name}</p>
              <p className="truncate text-[10px] text-muted">{t.vendor}</p>
            </div>
            <span className="shrink-0 rounded-full bg-good-bg px-2 py-0.5 text-[9px] font-semibold text-good">ตรวจแล้ว</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenNews({ news }: { news: HowNews[] }) {
  const badge = (level: number | null) =>
    level === 3 ? <span className="rounded-full bg-urgent-bg px-1.5 text-[9px] font-semibold text-urgent">ด่วน</span> : level === 2 ? <span className="rounded-full bg-warn-bg px-1.5 text-[9px] font-semibold text-warn">ควรรู้</span> : null;
  return (
    <div className="h-full">
      <ScreenTop title="ข่าว AI ที่องค์กรต้องรู้" />
      <div className="flex flex-col divide-y divide-line">
        {news.slice(0, 4).map((n) => (
          <div key={n.title} className="px-4 py-3">
            {badge(n.importance)}
            <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug">{n.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CursorIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 2l16 10-7 1.5L10 21z" />
    </svg>
  );
}
