import Link from "next/link";
import { connection } from "next/server";
import { NewsLead, NewsList, NewsSecondary } from "@/components/news/NewsCards";
import { AlertIcon } from "@/components/site/icons";
import { EmptyState, GroupDot, SectionHeader, card } from "@/components/site/ui";
import { VendorLogo } from "@/components/VendorLogo";
import { GROUP_SLUGS, categoryKeysOfGroup } from "@/lib/categories";
import { getAllCategoriesWithEntries, getCategoriesGrouped, getFeaturedTools } from "@/lib/data";
import { formatClock, formatLongDate } from "@/lib/format";
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
  const [top, latest, categories, featured, updatedAt] = await Promise.all([
    getTopStories(7, 3),
    listApprovedNews({ categories: groupCategories, pageSize: 10 }),
    getAllCategoriesWithEntries(),
    getFeaturedTools(),
    lastSuccessfulFetchAt(),
  ]);
  const [lead, ...secondary] = top;
  const urgent = top.find((n) => n.importance === 3);
  const topIds = new Set(top.map((n) => n.id));
  const latestItems = (groupCategories ? latest.items : latest.items.filter((n) => !topIds.has(n.id))).slice(0, 7);
  const toolCount = (keys: string[]) =>
    categories.filter((c) => keys.includes(c.key)).reduce((sum, c) => sum + c.entries.length, 0);
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);
  const groups = getCategoriesGrouped();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-7 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-4">
        <h1 className="text-[28px] font-bold sm:text-3xl">ข่าวเด่นวันนี้</h1>
        <p className="text-sm text-muted">
          {formatLongDate()}
          {updatedAt && ` · อัปเดตล่าสุด ${formatClock(updatedAt)} น.`} · ทุกข่าวผ่านการตรวจของทีมก่อนเผยแพร่
        </p>
      </div>

      {urgent && (
        <Link
          href={`/news/${urgent.id}`}
          className="mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-xl bg-urgent-bg px-4 py-3.5 text-urgent"
        >
          <AlertIcon size={20} />
          <span className="text-sm font-bold">องค์กรต้องรู้</span>
          <span className="flex-[1_1_280px] text-[15px] text-ink">{urgent.titleTh ?? urgent.title}</span>
          <span className="text-sm font-semibold">อ่านต่อ →</span>
        </Link>
      )}

      {lead ? (
        <section aria-label="ข่าวนำ" className="mt-6 flex flex-wrap gap-6">
          <div className="min-w-0 flex-[2_1_560px]">
            <NewsLead item={lead} />
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

      <section aria-labelledby="latest" className="mt-14 scroll-mt-20" id="latest-section">
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
                  className={`flex h-10 items-center rounded-full border px-4 text-sm ${
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

      <section aria-labelledby="groups" className="mt-14">
        <SectionHeader id="groups" title="เริ่มใช้ AI ตามงานของคุณ">
          คู่มือพร้อม prompt ตัวอย่างและเครื่องมือที่ทีมตรวจสอบแล้ว แยกตามลักษณะงาน
        </SectionHeader>
        <div className="mt-4 flex flex-wrap gap-4">
          {groups.map((g) => (
            <Link
              key={g.group}
              href={`/guides/${g.categories[0].key}`}
              className={`${card} flex min-w-0 flex-[1_1_260px] flex-col gap-2 px-5 py-4 hover:border-ink`}
            >
              <span className="flex items-center gap-2.5 text-[17px] font-bold">
                <GroupDot group={g.group} className="h-2.5 w-2.5 rounded-[3px]" />
                {g.group}
              </span>
              <span className="text-sm leading-relaxed text-muted">{g.categories.map((c) => c.titleTh).join(" · ")}</span>
              <span className="text-[13px] text-muted">{toolCount(g.categories.map((c) => c.key))} เครื่องมือ</span>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="tools" className="mt-14">
          <SectionHeader id="tools" title="เครื่องมือแนะนำ" href="/tools" linkLabel={`ดูเครื่องมือทั้ง ${totalTools} รายการ`} />
          <div className="mt-4 flex flex-wrap gap-4">
            {featured.map((t) => (
              <Link
                key={`${t.categoryKey}/${t.id}`}
                href={`/tools/${t.categoryKey}/${t.id}`}
                className={`${card} flex min-w-0 flex-[1_1_260px] flex-col gap-2.5 p-5 hover:border-ink`}
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
          {ROLES.map((r) => (
            <Link key={r.role} href={r.href} className={`${card} flex min-w-0 flex-[1_1_300px] flex-col gap-2 p-5 hover:border-ink`}>
              <span className="text-[13px] font-semibold text-brand">{r.role}</span>
              <span className="text-lg font-bold">{r.title}</span>
              <span className="text-sm leading-relaxed text-muted">{r.body}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
