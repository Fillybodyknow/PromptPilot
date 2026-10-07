import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageBanner, brandGradientText } from "@/components/site/PageBanner";
import { EmptyState, ToolStatusBadge, card } from "@/components/site/ui";
import { PAGE_VISUALS } from "@/lib/visuals";
import { VendorLogo } from "@/components/VendorLogo";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getAllCategoriesWithEntries } from "@/lib/data";
import { ACCESS_LABEL } from "@/lib/labels";
import { one, type SearchParams } from "@/lib/params";
import type { BaseEntry } from "@/lib/schema";

export const metadata: Metadata = {
  title: "เครื่องมือ AI ที่ทีมตรวจสอบแล้ว",
  description: "เปรียบเทียบเครื่องมือ AI สำหรับองค์กร แยกตามหมวดงาน พร้อมราคา วิธีเข้าถึง และวันที่ตรวจข้อมูลล่าสุด",
};

export default async function ToolsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const raw = await searchParams;
  const sp = { q: one(raw.q), category: one(raw.category), access: one(raw.access) };
  const q = sp.q?.trim().toLowerCase().slice(0, 100) || undefined;
  const category = getCategory(sp.category ?? "") ? sp.category : undefined;
  const access = sp.access && ACCESS_LABEL[sp.access] ? sp.access : undefined;

  const all = (await getAllCategoriesWithEntries()).flatMap((c) =>
    (c.entries as unknown as BaseEntry[]).map((e) => ({ ...e, categoryKey: c.key, categoryTitle: c.titleTh })),
  );
  const tools = all.filter(
    (t) =>
      (!category || t.categoryKey === category) &&
      (!access || t.accessMethod === access) &&
      (!q || [t.name, t.vendor, t.bestFor, t.summary].some((s) => s.toLowerCase().includes(q))),
  );
  const accessValues = Object.keys(ACCESS_LABEL).filter((a) => all.some((t) => t.accessMethod === a));
  const accessHref = (a?: string) => {
    const qs = new URLSearchParams(Object.entries({ q: sp.q?.trim() || undefined, category, access: a }).filter((e): e is [string, string] => !!e[1])).toString();
    return qs ? `/tools?${qs}` : "/tools";
  };
  const field = "h-11 rounded-lg border border-line bg-background px-3 text-ink";

  return (
    <>
    <PageBanner visual={PAGE_VISUALS.tools}>
      <div className="pb-10">
        <h1 className="text-4xl font-bold sm:text-[44px]">
          เครื่องมือ AI <span className={brandGradientText}>ที่ทีมตรวจสอบแล้ว</span>
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/85">
          {all.length} เครื่องมือใน {CATEGORIES.length} หมวดงาน ทุกรายการมีแหล่งอ้างอิงและวันที่ตรวจล่าสุด ราคาเปลี่ยนบ่อย ตรวจกับผู้ให้บริการก่อนตัดสินใจซื้อ
        </p>
      </div>
    </PageBanner>
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <form method="get" aria-label="ตัวกรองเครื่องมือ" className={`${card} relative z-10 -mt-8 flex flex-wrap items-end gap-3.5 p-4 shadow-xl shadow-black/10`}>
        <label className="flex flex-[2_1_220px] flex-col gap-1.5 text-[13px] text-muted">
          ค้นหาชื่อ ผู้ให้บริการ หรือการใช้งาน
          <input type="search" name="q" defaultValue={sp.q} placeholder="เช่น Copilot, Typhoon, ประชุม" className={field} />
        </label>
        <label className="flex flex-[1_1_220px] flex-col gap-1.5 text-[13px] text-muted">
          หมวดงาน
          <select name="category" defaultValue={category ?? ""} className={field}>
            <option value="">ทุกหมวด</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.titleTh}
              </option>
            ))}
          </select>
        </label>
        {access && <input type="hidden" name="access" value={access} />}
        <button type="submit" className="h-11 rounded-lg bg-ink px-5 font-semibold text-background">
          กรอง
        </button>
      </form>

      <nav aria-label="กรองตามวิธีเข้าถึง" className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">วิธีเข้าถึง:</span>
        {[undefined, ...accessValues].map((a) => {
          const active = a === access;
          return (
            <Link
              key={a ?? "all"}
              href={accessHref(a)}
              aria-current={active ? "true" : undefined}
              className={`flex h-10 items-center rounded-full border px-4 text-sm ${
                active ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface hover:border-ink"
              }`}
            >
              {a ? ACCESS_LABEL[a] : "ทั้งหมด"}
            </Link>
          );
        })}
      </nav>

      <p className="mt-5 text-sm text-muted">พบ {tools.length} เครื่องมือ</p>
      {tools.length === 0 ? (
        <div className="mt-4">
          <EmptyState>ไม่พบเครื่องมือตามเงื่อนไขที่เลือก</EmptyState>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-wrap gap-4">
          {tools.map((t) => (
            <Link
              key={`${t.categoryKey}/${t.id}`}
              href={`/tools/${t.categoryKey}/${t.id}`}
              className={`${card} flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 p-5 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg hover:shadow-black/10`}
            >
              <span className="flex items-center gap-3">
                <VendorLogo vendor={t.vendor} size={40} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold leading-snug">{t.name}</span>
                  <span className="text-[13px] text-muted">
                    {t.vendor} · {t.categoryTitle}
                  </span>
                </span>
              </span>
              <span className="text-sm leading-relaxed">{t.bestFor}</span>
              <span className="mt-auto flex flex-wrap items-center gap-1.5">
                <ToolStatusBadge status={t.status} />
                <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs">{ACCESS_LABEL[t.accessMethod] ?? t.accessMethod}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
    </>
  );
}
