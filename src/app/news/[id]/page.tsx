import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publisherOf } from "@/lib/news/publisher";
import { ShareButtons } from "@/components/news/ShareButtons";
import { ExternalIcon } from "@/components/site/icons";
import { Breadcrumb, CategoryChip, ImportanceBadge, card } from "@/components/site/ui";
import { getCategory } from "@/lib/categories";
import { getToolIndex } from "@/lib/data";
import { formatNewsTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { getApprovedNews, getRelatedNews } from "@/lib/news/public";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  return /^[0-9a-f]{16}$/.test(id) ? getApprovedNews(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await load((await params).id);
  if (!item) return { title: "ไม่พบข่าว" };
  const title = item.titleTh ?? item.title;
  return {
    title,
    description: item.summaryTh ?? undefined,
    openGraph: { title, description: item.summaryTh ?? undefined, type: "article", publishedTime: item.publishedAt },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const item = await load((await params).id);
  if (!item) notFound();

  const title = item.titleTh ?? item.title;
  const mainCategory = item.categories.map(getCategory).find(Boolean);
  const [related, toolIndex] = await Promise.all([getRelatedNews(item.categories, item.id, 3), getToolIndex()]);
  // เครื่องมือที่ข่าวพูดถึงจริงก่อน ถ้ายังไม่ได้ผูกไว้ ใช้ 2 ตัวแรกของหมวดหลักแทน
  const linked = toolIndex.filter((t) => item.toolIds.includes(t.id));
  const tools = (linked.length > 0 ? linked : toolIndex.filter((t) => t.categoryKey === mainCategory?.key).slice(0, 2)).slice(0, 4);
  const roles = (Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).filter((r) => item[r]);
  const publisher = publisherOf(item);

  return (
    <main className="mx-auto flex max-w-6xl flex-wrap gap-10 px-4 pb-16 pt-7 sm:px-6">
      <article className="min-w-0 flex-[999_1_640px]">
        <Breadcrumb
          items={[{ label: "ข่าว AI", href: "/news" }, ...(mainCategory ? [{ label: mainCategory.titleTh, href: `/guides/${mainCategory.key}` }] : [])]}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <ImportanceBadge level={item.importance} />
          {item.categories.map((c) => (
            <CategoryChip key={c} categoryKey={c} link />
          ))}
        </div>
        <h1 className="mt-3.5 text-[28px] font-bold leading-snug sm:text-[38px] sm:leading-[1.35]">{title}</h1>
        <p className="mt-3 text-sm text-muted">
          {publisher} · {formatNewsTime(item.publishedAt)} · ตรวจโดยทีมบรรณาธิการ
        </p>

        {item.summaryTh && <p className="mt-6 text-lg leading-[1.85] sm:text-[19px]">{item.summaryTh}</p>}

        {item.aiReason && (
          <div className="mt-6 rounded-2xl bg-brand-soft px-5 py-4">
            <h2 className="font-bold text-brand">ทำไมองค์กรควรสนใจ</h2>
            <p className="mt-1.5 leading-relaxed">{item.aiReason}</p>
          </div>
        )}

        {roles.length > 0 && (
          <section className="mt-9" aria-labelledby="roles">
            <h2 id="roles" className="text-xl font-bold">
              สิ่งที่แต่ละบทบาทควรทำ
            </h2>
            <div className="mt-3.5 flex flex-wrap gap-3.5">
              {roles.map((r) => (
                <div key={r} className={`${card} min-w-0 flex-[1_1_220px] p-[18px]`}>
                  <h3 className="text-sm font-bold text-brand">{ROLE_LABEL[r]}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed">{item[r]}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-xl bg-ink px-5 font-semibold text-background"
        >
          อ่านข่าวต้นฉบับที่ {publisher}
          <ExternalIcon size={16} />
        </a>

        {item.otherSources.length > 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-line px-5 py-4">
            <h2 className="font-bold">แหล่งอื่นที่รายงานเรื่องนี้</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              {item.otherSources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {s.title}
                  </a>{" "}
                  · {s.publisher}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <aside aria-label="ทำอะไรต่อ" className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
        {(mainCategory || tools.length > 0) && (
          <section className={`${card} p-5`}>
            <h2 className="font-bold">ทำอะไรต่อ</h2>
            {mainCategory && (
              <Link href={`/guides/${mainCategory.key}`} className="mt-3.5 block rounded-xl bg-background p-3.5 hover:text-brand">
                <span className="block text-[13px] text-muted">คู่มือ</span>
                <span className="block font-semibold">{mainCategory.titleTh}</span>
              </Link>
            )}
            {tools.map((t) => (
              <Link key={t.id} href={`/tools/${t.categoryKey}/${t.slug}`} className="mt-2.5 block rounded-xl bg-background p-3.5 hover:text-brand">
                <span className="block text-[13px] text-muted">{linked.length > 0 ? "เครื่องมือที่ข่าวนี้พูดถึง" : "เครื่องมือ"}</span>
                <span className="block font-semibold">{t.name}</span>
              </Link>
            ))}
          </section>
        )}
        {related.length > 0 && (
          <section className={`${card} p-5`}>
            <h2 className="font-bold">ข่าวที่เกี่ยวข้อง</h2>
            <ul className="mt-3 flex flex-col gap-3.5">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/news/${r.id}`} className="font-semibold leading-snug hover:text-brand">
                    {r.titleTh ?? r.title}
                  </Link>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {publisherOf(r)} · {formatNewsTime(r.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ShareButtons title={title} />
      </aside>
    </main>
  );
}
