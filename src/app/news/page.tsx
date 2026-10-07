import type { Metadata } from "next";
import Link from "next/link";
import { NewsList } from "@/components/news/NewsCards";
import { PageBanner, brandGradientText } from "@/components/site/PageBanner";
import { Pagination } from "@/components/site/Pagination";
import { PAGE_VISUALS } from "@/lib/visuals";
import { EmptyState, card } from "@/components/site/ui";
import { GROUP_SLUGS, categoryKeysOfGroup, getCategoriesGrouped } from "@/lib/categories";
import { bangkokDayKey, formatDayHeading } from "@/lib/format";
import { IMPORTANCE_LABEL } from "@/lib/labels";
import { listApprovedNews, type PublicNews } from "@/lib/news/public";
import { one, pageParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = {
  title: "ข่าว AI สำหรับองค์กร",
  description: "สรุปข่าว AI ที่มีผลต่อการเลือกและใช้เครื่องมือ AI ในองค์กรไทย ตรวจโดยทีมก่อนเผยแพร่ทุกชิ้น",
};

const PAGE_SIZE = 20;
const PERIODS = [
  { value: "7", label: "7 วันล่าสุด" },
  { value: "1", label: "24 ชั่วโมงล่าสุด" },
  { value: "30", label: "30 วันล่าสุด" },
  { value: "all", label: "ทั้งหมด" },
];

export default async function NewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const sp = { group: one(raw.group), days: one(raw.days), importance: one(raw.importance), q: one(raw.q) };
  const categories = categoryKeysOfGroup(sp.group);
  const days = PERIODS.some((p) => p.value === sp.days) ? sp.days! : "7";
  const importance = ["1", "2", "3"].includes(sp.importance ?? "") ? Number(sp.importance) : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = pageParam(raw.page);

  const { items, total } = await listApprovedNews({
    categories,
    importance,
    sinceDays: days === "all" ? undefined : Number(days),
    q,
    page,
    pageSize: PAGE_SIZE,
  });

  const days_: { key: string; heading: string; items: PublicNews[] }[] = [];
  for (const item of items) {
    const key = bangkokDayKey(item.publishedAt);
    const last = days_.at(-1);
    if (last?.key === key) last.items.push(item);
    else days_.push({ key, heading: formatDayHeading(item.publishedAt), items: [item] });
  }

  const keep = { group: categories ? sp.group : undefined, days: days === "7" ? undefined : days, q };
  const importanceHref = (level?: number) => {
    const qs = new URLSearchParams(
      Object.entries({ ...keep, importance: level ? String(level) : undefined }).filter((e): e is [string, string] => !!e[1]),
    ).toString();
    return qs ? `/news?${qs}` : "/news";
  };
  const field = "h-11 rounded-lg border border-line bg-background px-3 text-ink";

  return (
    <>
    <PageBanner visual={PAGE_VISUALS.news}>
      <div className="pb-10">
        <h1 className="text-4xl font-bold sm:text-[44px]">
          ข่าว AI <span className={brandGradientText}>สำหรับองค์กร</span>
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/85">
          สรุปข่าวที่มีผลต่อการเลือกและใช้เครื่องมือ AI ในองค์กรไทย คัดด้วย AI และตรวจโดยทีมก่อนเผยแพร่ทุกชิ้น พร้อมลิงก์ไปข่าวต้นฉบับ
        </p>
      </div>
    </PageBanner>
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <form method="get" aria-label="ตัวกรองข่าว" className={`${card} relative z-10 -mt-8 flex flex-wrap items-end gap-3.5 p-4 shadow-xl shadow-black/10`}>
        <label className="flex flex-[1_1_180px] flex-col gap-1.5 text-[13px] text-muted">
          กลุ่มงาน
          <select name="group" defaultValue={categories ? sp.group : ""} className={field}>
            <option value="">ทุกกลุ่มงาน</option>
            {getCategoriesGrouped().map((g) => (
              <option key={g.group} value={GROUP_SLUGS[g.group]}>
                {g.group}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-[1_1_150px] flex-col gap-1.5 text-[13px] text-muted">
          ช่วงเวลา
          <select name="days" defaultValue={days} className={field}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-[2_1_220px] flex-col gap-1.5 text-[13px] text-muted">
          ค้นหา
          <input type="search" name="q" defaultValue={q} placeholder="เช่น Copilot, PDPA" className={field} />
        </label>
        {importance && <input type="hidden" name="importance" value={importance} />}
        <button type="submit" className="h-11 rounded-lg bg-ink px-5 font-semibold text-background">
          กรอง
        </button>
      </form>

      <nav aria-label="กรองตามความสำคัญ" className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">ความสำคัญ:</span>
        {[undefined, 3, 2, 1].map((level) => {
          const active = level === importance;
          return (
            <Link
              key={level ?? "all"}
              href={importanceHref(level)}
              aria-current={active ? "true" : undefined}
              className={`flex h-10 items-center rounded-full border px-4 text-sm ${
                active ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface hover:border-ink"
              }`}
            >
              {level ? IMPORTANCE_LABEL[level] : "ทั้งหมด"}
            </Link>
          );
        })}
      </nav>

      <p className="mt-5 text-sm text-muted">พบ {total} ข่าว</p>

      {days_.length === 0 ? (
        <div className="mt-4">
          <EmptyState>ไม่มีข่าวตามเงื่อนไขที่เลือก ลองขยายช่วงเวลาหรือล้างตัวกรอง</EmptyState>
        </div>
      ) : (
        days_.map((d) => (
          <section key={d.key} className="mt-5">
            <h2 className="mb-2.5 text-[15px] font-bold text-muted">{d.heading}</h2>
            <NewsList items={d.items} showImportance />
          </section>
        ))
      )}

      <Pagination basePath="/news" params={{ ...keep, importance: importance ? String(importance) : undefined }} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </main>
    </>
  );
}
