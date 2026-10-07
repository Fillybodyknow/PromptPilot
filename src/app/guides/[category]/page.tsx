import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CopyButton } from "@/components/guides/CopyButton";
import { NewsList } from "@/components/news/NewsCards";
import { PageBanner } from "@/components/site/PageBanner";
import { groupVisual } from "@/lib/visuals";
import { Breadcrumb, EmptyState, GroupDot, ToolStatusBadge, card } from "@/components/site/ui";
import { CATEGORIES, GROUP_SLUGS, getCategoriesGrouped, getCategory } from "@/lib/categories";
import { getCategoryEntries, getCategoryGuide } from "@/lib/data";
import { ACCESS_LABEL, ACCESS_LABEL_LONG, GUIDE_NOTE_LABEL } from "@/lib/labels";
import { listApprovedNews } from "@/lib/news/public";
import { one, type SearchParams } from "@/lib/params";
import type { BaseEntry } from "@/lib/schema";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> };

const TABS = ["overview", "prompts", "tools", "news"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = getCategory((await params).category);
  return cat ? { title: `คู่มือ ${cat.titleTh}`, description: cat.descriptionTh } : { title: "ไม่พบหมวด" };
}

export default async function GuidePage({ params, searchParams }: Props) {
  await connection();
  const [{ category: key }, sp] = await Promise.all([params, searchParams]);
  const rawTab = one(sp.tab);
  const category = getCategory(key);
  if (!category) notFound();
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "overview";

  const [guide, entries, news] = await Promise.all([
    getCategoryGuide(key),
    getCategoryEntries<BaseEntry>(key),
    listApprovedNews({ categories: [key], pageSize: 10 }),
  ]);
  const prompts = guide?.promptTemplates ?? [];
  const tabLabel: Record<Tab, string> = {
    overview: "ภาพรวม",
    prompts: `Prompt ตัวอย่าง (${prompts.length})`,
    tools: `เครื่องมือแนะนำ (${entries.length})`,
    news: `ข่าวในหมวดนี้ (${news.total})`,
  };
  const siblings = CATEGORIES.filter((c) => c.group === category.group && c.key !== key);
  const otherGroups = getCategoriesGrouped().filter((g) => g.group !== category.group);

  return (
    <>
    <PageBanner visual={groupVisual(category.group)}>
      <Breadcrumb onDark items={[{ label: "คู่มือตามงาน", href: "/guides" }, { label: category.titleTh }]} />
      <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold backdrop-blur-sm">
        <GroupDot group={category.group} />
        {category.group}
      </span>
      <h1 className="mt-3 text-4xl font-bold sm:text-[44px]">{category.titleTh}</h1>
      <p className="mt-2 max-w-2xl text-lg text-white/85">{category.descriptionTh}</p>
    </PageBanner>
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <nav aria-label="ส่วนของคู่มือ" className="mt-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t}
            href={t === "overview" ? `/guides/${key}` : `/guides/${key}?tab=${t}`}
            scroll={false}
            aria-current={t === tab ? "page" : undefined}
            className={`flex h-12 items-center border-b-[3px] px-4 text-[15px] ${
              t === tab ? "border-brand font-bold text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tabLabel[t]}
          </Link>
        ))}
      </nav>

      <div className="mt-7 flex flex-wrap gap-8">
        <div className="min-w-0 flex-[999_1_640px]">
          {tab === "overview" &&
            (guide ? (
              <div className="flex flex-col gap-5">
                <section className={`${card} p-6`}>
                  <h2 className="text-xl font-bold">ใช้ AI กับงานนี้อย่างไร</h2>
                  <p className="mt-2.5 whitespace-pre-line leading-[1.85]">{guide.howToUse}</p>
                </section>
                <section className="rounded-2xl bg-warn-bg px-6 py-5">
                  <h2 className="font-bold text-warn">ข้อมูลที่ห้ามวางลงใน AI</h2>
                  <p className="mt-2 leading-[1.8]">{guide.dataHandlingNote}</p>
                </section>
                <section className={`${card} p-6`}>
                  <h2 className="text-lg font-bold">เริ่มใช้งาน</h2>
                  <p className="mt-1.5 text-sm text-muted">{ACCESS_LABEL_LONG[guide.accessMethod] ?? guide.accessMethod}</p>
                  {guide.installSteps && guide.installSteps.length > 0 && (
                    <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed">
                      {guide.installSteps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  )}
                  {guide.links && guide.links.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {guide.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-2 text-sm text-brand hover:border-ink">
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </section>
                {(Object.keys(GUIDE_NOTE_LABEL) as (keyof typeof GUIDE_NOTE_LABEL)[])
                  .filter((k) => guide[k])
                  .map((k) => (
                    <section key={k} className={`${card} p-6`}>
                      <h2 className="text-lg font-bold">{GUIDE_NOTE_LABEL[k]}</h2>
                      <p className="mt-2 leading-[1.8] text-muted">{guide[k]}</p>
                    </section>
                  ))}
                <div className="flex flex-wrap gap-3.5">
                  {(["prompts", "tools", "news"] as const).map((t) => (
                    <Link key={t} href={`/guides/${key}?tab=${t}`} scroll={false} className={`${card} flex-[1_1_200px] p-[18px] hover:border-ink`}>
                      <span className="block text-sm text-muted">ไปที่</span>
                      <span className="block font-semibold">{tabLabel[t]}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState>หมวดนี้ยังไม่มีคู่มือ ดูเครื่องมือแนะนำในแท็บถัดไปได้ก่อน</EmptyState>
            ))}

          {tab === "prompts" && (
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-muted">
                ป้าย “ทดสอบแล้ว” แปลว่ามีคนรัน prompt จริงและแนบผลลัพธ์เป็นหลักฐาน ส่วน “ร่าง ยังไม่ได้ทดสอบ”
                เขียนจากหลักการทั่วไป ควรลองกับงานจริงขององค์กรก่อนแนะนำใช้วงกว้าง
              </p>
              {prompts.length === 0 && <EmptyState>ยังไม่มี prompt ตัวอย่างในหมวดนี้</EmptyState>}
              {prompts.map((p) => (
                <article key={p.task} className={`${card} flex flex-col gap-3.5 p-6`}>
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <h2 className="text-lg font-bold">{p.task}</h2>
                    {p.tested ? (
                      <span className="rounded-full bg-good-bg px-2.5 py-0.5 text-xs font-semibold text-good">
                        ทดสอบแล้ว · {p.testedAt} · {p.testedWith.join(", ")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-semibold text-warn">ร่าง ยังไม่ได้ทดสอบ</span>
                    )}
                  </div>
                  {!p.tested && p.draftNote && <p className="text-sm leading-relaxed text-muted">{p.draftNote}</p>}
                  {p.badPrompt && (
                    <div className="rounded-xl bg-urgent-bg px-4 py-3">
                      <span className="text-[13px] font-bold text-urgent">แบบที่ได้ผลไม่ดี</span>
                      <p className="mt-1 leading-relaxed">{p.badPrompt}</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-good-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-good">แบบที่แนะนำ</span>
                      <CopyButton text={p.goodPrompt} />
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{p.goodPrompt}</p>
                  </div>
                  <p className="leading-relaxed text-muted">
                    <strong className="font-semibold text-ink">ทำไมได้ผล:</strong> {p.why}
                    {p.sourceUrl && (
                      <>
                        {" "}
                        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                          (แหล่งอ้างอิง ↗)
                        </a>
                      </>
                    )}
                  </p>
                  {p.sampleOutput && (
                    <details className="rounded-xl border border-line">
                      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">หลักฐาน: ตัวอย่างผลลัพธ์จริงจากการทดสอบ</summary>
                      <p className="whitespace-pre-wrap border-t border-line px-4 py-3 text-sm leading-relaxed text-muted">{p.sampleOutput}</p>
                    </details>
                  )}
                </article>
              ))}
            </div>
          )}

          {tab === "tools" &&
            (entries.length === 0 ? (
              <EmptyState>ยังไม่มีเครื่องมือในหมวดนี้</EmptyState>
            ) : (
              <div className={`${card} overflow-x-auto`}>
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="px-4 py-3.5 font-semibold">เครื่องมือ</th>
                      <th className="px-4 py-3.5 font-semibold">เหมาะกับ</th>
                      <th className="px-4 py-3.5 font-semibold">ราคา</th>
                      <th className="px-4 py-3.5 font-semibold">เข้าถึงผ่าน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((t) => (
                      <tr key={t.id} className="border-t border-line align-top">
                        <td className="px-4 py-3.5">
                          <Link href={`/tools/${key}/${t.id}`} className="font-semibold text-brand hover:underline">
                            {t.name}
                          </Link>
                          <span className="block text-[13px] text-muted">{t.vendor}</span>
                          {t.status !== "active" && (
                            <span className="mt-1 block">
                              <ToolStatusBadge status={t.status} />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 leading-relaxed">{t.bestFor}</td>
                        <td className="px-4 py-3.5 leading-relaxed">
                          <span className="line-clamp-3">{t.priceNote}</span>
                        </td>
                        <td className="px-4 py-3.5">{ACCESS_LABEL[t.accessMethod] ?? t.accessMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === "news" &&
            (news.items.length === 0 ? (
              <EmptyState>ยังไม่มีข่าวในหมวดนี้</EmptyState>
            ) : (
              <>
                <NewsList items={news.items} showImportance />
                {news.total > news.items.length && (
                  <Link
                    href={`/news?group=${GROUP_SLUGS[category.group]}&days=all`}
                    className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
                  >
                    ดูข่าวทั้งหมดในกลุ่ม{category.group} →
                  </Link>
                )}
              </>
            ))}
        </div>

        <aside aria-label="หมวดที่เกี่ยวข้อง" className="flex min-w-0 flex-[1_1_260px] flex-col gap-4">
          {siblings.length > 0 && (
            <section className={`${card} p-5`}>
              <h2 className="font-bold">หมวดอื่นในกลุ่ม{category.group}</h2>
              {siblings.map((s) => (
                <Link key={s.key} href={`/guides/${s.key}`} className="mt-3 block rounded-xl bg-background px-3.5 py-3 font-semibold hover:text-brand">
                  {s.titleTh}
                </Link>
              ))}
            </section>
          )}
          <section className={`${card} p-5`}>
            <h2 className="font-bold">กลุ่มงานอื่น</h2>
            <ul className="mt-2.5">
              {otherGroups.map((g) => (
                <li key={g.group}>
                  <Link href={`/guides/${g.categories[0].key}`} className="flex min-h-10 items-center gap-2.5 hover:text-brand">
                    <GroupDot group={g.group} />
                    {g.group}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
    </>
  );
}
