import Link from "next/link";
import type { CSSProperties } from "react";
import { connection } from "next/server";
import { NewsLead, NewsList, NewsSecondary } from "@/components/news/NewsCards";
import { GroupCard } from "@/components/site/GroupCard";
import { HowItWorks } from "@/components/site/HowItWorks";
import { KineticBand } from "@/components/site/KineticBand";
import { ScrollFx } from "@/components/site/ScrollFx";
import { AlertIcon, SearchIcon } from "@/components/site/icons";
import { PageBanner } from "@/components/site/PageBanner";
import { CountUp, EmptyState, RotatingWords, SectionHeader, card } from "@/components/site/ui";
import { VendorStrip } from "@/components/site/VendorStrip";
import { VendorLogo } from "@/components/VendorLogo";
import { withBasePath } from "@/lib/basePath";
import { GROUP_SLUGS, categoryKeysOfGroup, getCategory } from "@/lib/categories";
import { HERO_VISUAL, groupVisual } from "@/lib/visuals";
import { getGroupAccent } from "@/lib/groupAccent";
import { getAllCategoriesWithEntries, getCategoriesGrouped, getFeaturedTools } from "@/lib/data";
import { formatClock, formatLongDate } from "@/lib/format";
import { getVendorLogoInfo, vendorLogoKey } from "@/lib/logos";
import { getTopStories, listApprovedNews } from "@/lib/news/public";
import { lastSuccessfulFetchAt } from "@/lib/news/repo";
import { one, type SearchParams } from "@/lib/params";

const ROLES = [
  { role: "พนักงานทั่วไป", title: "เริ่มจากงานที่ทำทุกวัน", body: "prompt ตัวอย่างที่ใช้ได้ทันที และสิ่งที่ห้ามวางลงใน AI", href: "/guides" },
  { role: "ฝ่าย IT / ทีมพัฒนา", title: "ติดตั้ง ตั้งค่า และคุมความปลอดภัย", body: "วิธีเข้าถึง ตัวเลือก self-hosted และข่าวช่องโหว่หรืออัปเดตที่ต้องรู้", href: "/tools" },
  { role: "ผู้บริหาร / ผู้ตัดสินใจ", title: "ตัดสินใจลงทุนอย่างมีข้อมูล", body: "ต้นทุนรวมต่อคน ความเสี่ยง และข่าวกฎหมายหรือนโยบายที่กระทบองค์กร", href: "/news?importance=3" },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const group = one((await searchParams).group);
  const groupCategories = categoryKeysOfGroup(group);
  const [top, latest, categories, featured, updatedAt, week] = await Promise.all([
    getTopStories(7, 3),
    listApprovedNews({ categories: groupCategories, pageSize: 10 }),
    getAllCategoriesWithEntries(),
    getFeaturedTools(),
    lastSuccessfulFetchAt(),
    listApprovedNews({ sinceDays: 7, pageSize: 1 }),
  ]);
  const [lead, ...secondary] = top;
  const urgent = top.find((n) => n.importance === 3);
  const topIds = new Set(top.map((n) => n.id));
  const latestItems = (groupCategories ? latest.items : latest.items.filter((n) => !topIds.has(n.id))).slice(0, 7);
  const toolCount = (keys: string[]) =>
    categories.filter((c) => keys.includes(c.key)).reduce((sum, c) => sum + c.entries.length, 0);
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);
  const groups = getCategoriesGrouped();
  // ผู้ให้บริการที่มีเครื่องมืออยู่ในฐานข้อมูลจริงและมีไฟล์โลโก้แบบยาว เรียงตามจำนวนเครื่องมือ
  const vendorTools = new Map<string, number>();
  for (const c of categories)
    for (const e of c.entries as { vendor: string }[]) {
      const key = vendorLogoKey(e.vendor);
      if (getVendorLogoInfo(key).longSrc) vendorTools.set(key, (vendorTools.get(key) ?? 0) + 1);
    }
  const vendors = [...vendorTools].sort((a, b) => b[1] - a[1]).map(([v]) => v);

  const leadGroup = lead?.categories.map(getCategory).find(Boolean)?.group;

  return (
    <>
      {/* ลูกเล่นตอน scroll: header ซ่อน/โผล่ตามทิศ + แถบบอกว่าเลื่อนมาถึงไหนแล้ว */}
      <ScrollFx />
      <div aria-hidden className="read-progress fixed inset-x-0 top-0 z-50 h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400" />
      <PageBanner visual={HERO_VISUAL} size="lg">
        <div className={lead ? "pb-16" : ""}>
          <p className="fade-up flex items-center gap-2 text-sm text-white/75">
            <span aria-hidden className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            {formatLongDate()}
            {updatedAt && ` · อัปเดตล่าสุด ${formatClock(updatedAt)} น.`}
          </p>
          <h1 style={{ animationDelay: "100ms" }} className="fade-up mt-3 max-w-3xl text-4xl font-bold leading-[1.2] sm:text-[52px]">
            ข่าว AI ที่<RotatingWords words={["องค์กรไทย", "ฝ่าย IT", "ผู้บริหาร", "ทุกทีม"]} />ต้องรู้ วันนี้
          </h1>
          <p style={{ animationDelay: "200ms" }} className="fade-up mt-4 max-w-2xl text-lg leading-relaxed text-white/85">
            สรุปข่าวที่มีผลต่อการเลือกและใช้เครื่องมือ AI คัดด้วย AI และตรวจโดยทีมทุกชิ้น พร้อมคู่มือและเครื่องมือที่ทดสอบแล้ว
          </p>
          <form action={withBasePath("/search")} role="search" style={{ animationDelay: "300ms" }} className="fade-up mt-6 flex max-w-xl gap-2">
            <label className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-4 text-white/80 backdrop-blur-md focus-within:border-white/60">
              <SearchIcon />
              <input type="search" name="q" placeholder="ค้นหาข่าว เครื่องมือ หรือคู่มือ" aria-label="ค้นหา" className="w-full bg-transparent text-white outline-none placeholder:text-white/60" />
            </label>
            <button type="submit" className="h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110">
              ค้นหา
            </button>
          </form>
          <dl style={{ animationDelay: "400ms" }} className="fade-up mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/80">
            <div><dt className="sr-only">ข่าว 7 วัน</dt><dd><strong className="text-xl text-white"><CountUp value={week.total} /></strong> ข่าวในสัปดาห์นี้</dd></div>
            <div><dt className="sr-only">เครื่องมือ</dt><dd><strong className="text-xl text-white"><CountUp value={totalTools} /></strong> เครื่องมือที่ตรวจแล้ว</dd></div>
            <div><dt className="sr-only">คู่มือ</dt><dd><strong className="text-xl text-white"><CountUp value={categories.length} /></strong> คู่มือตามงาน</dd></div>
          </dl>
          {urgent && (
            <Link
              href={`/news/${urgent.id}`}
              style={{ animationDelay: "500ms" }}
              className="fade-up mt-6 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-rose-300/30 bg-rose-500/20 px-4 py-3 backdrop-blur-md hover:bg-rose-500/30"
            >
              <span className="relative flex">
                <span aria-hidden className="absolute inset-0 rounded-full bg-rose-400/60 motion-safe:animate-ping" />
                <AlertIcon size={18} className="relative text-rose-200" />
              </span>
              <span className="text-sm font-bold text-rose-100">องค์กรต้องรู้</span>
              <span className="flex-[1_1_240px] text-[15px] text-white">{urgent.titleTh ?? urgent.title}</span>
              <span className="text-sm font-semibold text-rose-100">อ่านต่อ →</span>
            </Link>
          )}
        </div>
      </PageBanner>

      {/* main เต็มความกว้าง ให้แถบตัวอักษรวิ่งได้สุดขอบจอโดยไม่ใช้ 100vw (ซึ่งรวมความกว้าง scrollbar แล้วทำให้หน้าเลื่อนแนวนอนได้) */}
      <main className="pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {lead ? (
        <section aria-label="ข่าวเด่นวันนี้" className="relative z-10 -mt-12 flex flex-wrap gap-6">
          <div className="min-w-0 flex-[2_1_560px]">
            <NewsLead item={lead} visual={leadGroup ? groupVisual(leadGroup) : undefined} />
          </div>
          {secondary.length > 0 && (
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
              {secondary.map((n) => (
                <NewsSecondary key={n.id} item={n} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="mt-6">
          <EmptyState>ยังไม่มีข่าวที่ผ่านการตรวจในสัปดาห์นี้</EmptyState>
        </div>
      )}

      {vendors.length > 0 && (
        <section aria-labelledby="vendors" className={`${card} reveal mt-10 overflow-hidden bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 px-5 py-6 sm:px-8`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="vendors" className="text-lg font-bold">
              ครอบคลุมเครื่องมือจาก <span className="text-brand">{vendors.length}</span> ผู้ให้บริการ
            </h2>
            <Link href="/tools" className="text-sm font-semibold text-brand hover:underline">
              ดูเครื่องมือทั้งหมด →
            </Link>
          </div>
          <div className="mt-5">
            <VendorStrip vendors={vendors} />
          </div>
        </section>
      )}

      <section aria-labelledby="latest" className="reveal mt-14 scroll-mt-20" id="latest-section">
        <SectionHeader id="latest" title="ข่าวล่าสุด" href="/news" linkLabel="ดูข่าวทั้งหมด" />
        <nav aria-label="กรองตามกลุ่มงาน" className="mt-3.5 flex flex-wrap gap-2">
          {[{ name: "ทั้งหมด", slug: undefined as string | undefined }, ...groups.map((g) => ({ name: g.group, slug: GROUP_SLUGS[g.group] }))].map(
            (g) => {
              const active = g.slug === (groupCategories ? group : undefined);
              return (
                <Link
                  key={g.name}
                  href={g.slug ? `/?group=${g.slug}#latest-section` : "/#latest-section"}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`flex h-10 items-center rounded-full border px-4 text-sm transition-all duration-200 active:scale-95 ${
                    active ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface hover:border-ink"
                  }`}
                >
                  {g.name}
                </Link>
              );
            },
          )}
        </nav>
        <div className="mt-4">
          {latestItems.length > 0 ? <NewsList items={latestItems} /> : <EmptyState>ยังไม่มีข่าวในกลุ่มนี้</EmptyState>}
        </div>
      </section>

      </div>

      {/* 4 ขั้นเริ่มใช้งานแบบ scrollytelling — ใช้กลุ่มงาน เครื่องมือแนะนำ และข่าวเด่นจริงเป็นหน้าจอตัวอย่าง */}
      <HowItWorks
        groups={groups.map((g) => ({ name: g.group, dot: getGroupAccent(g.group).dot }))}
        tools={featured.map((t) => ({ name: t.name, vendor: t.vendor }))}
        news={(top.length > 0 ? top : latest.items).map((n) => ({ title: n.titleTh ?? n.title, importance: n.importance }))}
      />

      <KineticBand words={["ข่าว AI", "คู่มือตามงาน", "เครื่องมือที่ตรวจแล้ว", "PromptPilot"]} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">

      <section aria-labelledby="groups">
        <SectionHeader id="groups" title="เริ่มใช้ AI ตามงานของคุณ">
          คู่มือพร้อม prompt ตัวอย่างและเครื่องมือที่ทีมตรวจสอบแล้ว แยกตามลักษณะงาน
        </SectionHeader>
        <div className="mt-4 flex flex-wrap gap-4">
          {groups.map((g, i) => (
            <GroupCard
              index={i}
              key={g.group}
              group={g.group}
              href={`/guides/${g.categories[0].key}`}
              categories={g.categories.map((c) => c.titleTh)}
              toolCount={toolCount(g.categories.map((c) => c.key))}
            />
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="tools" className="mt-14">
          <SectionHeader id="tools" title="เครื่องมือแนะนำ" href="/tools" linkLabel={`ดูเครื่องมือทั้ง ${totalTools} รายการ`} />
          {/* การ์ดเลื่อนเข้าจากข้างจอ — ตัดส่วนที่ล้นแนวนอนทิ้ง ไม่ให้หน้าเลื่อนข้างได้บนมือถือ (padding ติดลบเผื่อเงาการ์ด) */}
          <div className="-mx-3 mt-1 flex flex-wrap gap-4 overflow-x-clip px-3 py-3">
            {featured.map((t, i) => (
              <Link
                key={`${t.categoryKey}/${t.id}`}
                href={`/tools/${t.categoryKey}/${t.id}`}
                style={{ "--dir": i % 2 ? 1 : -1 } as CSSProperties}
                className={`${card} tilt reveal-side flex min-w-0 flex-[1_1_260px] flex-col gap-2.5 p-5 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg hover:shadow-black/10`}
              >
                <span className="flex items-center gap-3">
                  <VendorLogo vendor={t.vendor} size={40} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold leading-snug">{t.name}</span>
                    <span className="text-[13px] text-muted">{t.vendor}</span>
                  </span>
                </span>
                <span className="text-sm leading-relaxed">{t.bestFor}</span>
                <span className="mt-auto line-clamp-2 text-[13px] text-muted">{t.priceNote}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="roles" className="mt-14">
        <SectionHeader id="roles" title="อ่านตามบทบาทของคุณ" />
        <div className="mt-4 flex flex-wrap gap-4">
          {ROLES.map((r, i) => (
            <Link
              key={r.role}
              href={r.href}
              style={{ "--i": i } as CSSProperties}
              className={`${card} reveal-pop relative flex min-w-0 flex-[1_1_300px] flex-col gap-2 overflow-hidden p-5 pt-6 transition hover:-translate-y-0.5 hover:border-brand/50`}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
              <span className="text-[13px] font-semibold text-brand">{r.role}</span>
              <span className="text-lg font-bold">{r.title}</span>
              <span className="text-sm leading-relaxed text-muted">{r.body}</span>
            </Link>
          ))}
        </div>
      </section>
      </div>
      </main>
    </>
  );
}
