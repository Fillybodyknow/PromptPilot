import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { NewsList } from "@/components/news/NewsCards";
import { EmptyState, card } from "@/components/site/ui";
import { CATEGORIES } from "@/lib/categories";
import { getAllCategoriesWithEntries, getCategoryGuide } from "@/lib/data";
import { listApprovedNews } from "@/lib/news/public";
import { one, type SearchParams } from "@/lib/params";
import type { BaseEntry } from "@/lib/schema";

export const metadata: Metadata = { title: "ค้นหา" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const q = one((await searchParams).q)?.trim().slice(0, 100) ?? "";
  const needle = q.toLowerCase();
  const has = (...texts: (string | undefined)[]) => texts.some((t) => t?.toLowerCase().includes(needle));

  const [news, categories, guides] = q
    ? await Promise.all([
        listApprovedNews({ q, pageSize: 10 }),
        getAllCategoriesWithEntries(),
        Promise.all(CATEGORIES.map((c) => getCategoryGuide(c.key))),
      ])
    : [null, [], []];

  const tools = categories
    .flatMap((c) => (c.entries as unknown as BaseEntry[]).map((e) => ({ ...e, categoryKey: c.key, categoryTitle: c.titleTh })))
    .filter((t) => has(t.name, t.vendor, t.bestFor, t.summary))
    .slice(0, 12);
  const guideHits = CATEGORIES.filter((c, i) => has(c.titleTh, c.descriptionTh, guides[i]?.howToUse));

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-[32px] font-bold">ค้นหา</h1>
      <form method="get" role="search" className="mt-4 flex gap-2.5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus={!q}
          placeholder="ค้นหาข่าว เครื่องมือ หรือคู่มือ"
          aria-label="คำค้น"
          className="h-12 flex-1 rounded-xl border border-line bg-surface px-4 text-ink"
        />
        <button type="submit" className="h-12 rounded-xl bg-ink px-6 font-semibold text-background">
          ค้นหา
        </button>
      </form>

      {q && (
        <>
          <section className="mt-9" aria-labelledby="r-guides">
            <h2 id="r-guides" className="text-xl font-bold">
              คู่มือ ({guideHits.length})
            </h2>
            {guideHits.length === 0 ? (
              <p className="mt-2 text-muted">ไม่พบคู่มือที่ตรงกับ “{q}”</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {guideHits.map((c) => (
                  <Link key={c.key} href={`/guides/${c.key}`} className={`${card} flex-[1_1_260px] p-4 hover:border-ink`}>
                    <span className="block font-semibold">{c.titleTh}</span>
                    <span className="block text-sm text-muted">{c.descriptionTh}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-9" aria-labelledby="r-tools">
            <h2 id="r-tools" className="text-xl font-bold">
              เครื่องมือ ({tools.length})
            </h2>
            {tools.length === 0 ? (
              <p className="mt-2 text-muted">ไม่พบเครื่องมือที่ตรงกับ “{q}”</p>
            ) : (
              <ul className={`${card} mt-3`}>
                {tools.map((t) => (
                  <li key={`${t.categoryKey}/${t.id}`} className="border-t border-line px-5 py-3.5 first:border-t-0">
                    <Link href={`/tools/${t.categoryKey}/${t.id}`} className="font-semibold text-brand hover:underline">
                      {t.name}
                    </Link>
                    <span className="block text-sm text-muted">
                      {t.vendor} · {t.categoryTitle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-9" aria-labelledby="r-news">
            <h2 id="r-news" className="text-xl font-bold">
              ข่าว ({news?.total ?? 0})
            </h2>
            <div className="mt-3">
              {news && news.items.length > 0 ? (
                <>
                  <NewsList items={news.items} showImportance />
                  {news.total > news.items.length && (
                    <Link href={`/news?q=${encodeURIComponent(q)}&days=all`} className="mt-3 inline-block font-semibold text-brand hover:underline">
                      ดูข่าวทั้งหมด {news.total} ข่าว →
                    </Link>
                  )}
                </>
              ) : (
                <EmptyState>ไม่พบข่าวที่ตรงกับ “{q}”</EmptyState>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
