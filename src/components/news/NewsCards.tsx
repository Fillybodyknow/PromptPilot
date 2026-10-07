import Image from "next/image";
import Link from "next/link";
import type { Visual } from "@/lib/visuals";
import { getCategory } from "@/lib/categories";
import { formatNewsTime } from "@/lib/format";
import type { PublicNews } from "@/lib/news/public";
import { publisherOf } from "@/lib/news/publisher";
import { CategoryChip, GroupDot, ImportanceBadge, card } from "../site/ui";

const href = (item: PublicNews) => `/news/${item.id}`;
const titleOf = (item: PublicNews) => item.titleTh ?? item.title;

function Meta({ item, className = "" }: { item: PublicNews; className?: string }) {
  const others = item.otherSources.length;
  return (
    <span className={`text-[13px] text-muted ${className}`}>
      {publisherOf(item)} · {formatNewsTime(item.publishedAt)}
      {others > 0 && ` · รายงานโดยอีก ${others} แหล่ง`}
    </span>
  );
}

export function NewsLead({ item, visual }: { item: PublicNews; visual?: Visual }) {
  return (
    <article className={`${card} flex flex-col gap-3.5 overflow-hidden shadow-xl shadow-black/10 ${visual ? "" : "p-6 sm:p-7"}`}>
      {visual && (
        <Link href={href(item)} className="relative block aspect-[21/9] w-full overflow-hidden" tabIndex={-1} aria-hidden>
          <Image src={visual.src} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 700px, 100vw" className="object-cover transition-transform duration-500 hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </Link>
      )}
      <div className={visual ? "flex flex-col gap-3.5 px-6 pb-6 sm:px-7 sm:pb-7" : "contents"}>
      <div className="flex flex-wrap items-center gap-2">
        <ImportanceBadge level={item.importance} />
        {item.categories.slice(0, 2).map((c) => (
          <CategoryChip key={c} categoryKey={c} />
        ))}
      </div>
      <h2 className="text-2xl font-bold leading-snug sm:text-[32px] sm:leading-[1.35]">
        <Link href={href(item)} className="hover:text-brand">
          {titleOf(item)}
        </Link>
      </h2>
      {item.summaryTh && <p className="text-[17px] leading-relaxed text-muted">{item.summaryTh}</p>}
      {item.aiReason && (
        <p className="rounded-xl bg-background px-4 py-3 text-[15px] leading-relaxed">
          <strong className="font-semibold">ทำไมองค์กรควรสนใจ:</strong> {item.aiReason}
        </p>
      )}
      <div className="mt-auto flex flex-wrap justify-between gap-2">
        <Meta item={item} className="text-sm" />
        <Link href={href(item)} className="text-sm font-semibold text-brand hover:underline">
          อ่านสรุปเต็ม →
        </Link>
      </div>
      </div>
    </article>
  );
}

export function NewsSecondary({ item }: { item: PublicNews }) {
  return (
    <article className={`${card} flex flex-1 flex-col gap-2.5 p-5 shadow-xl shadow-black/10 transition-colors hover:border-brand/50`}>
      <div className="flex flex-wrap items-center gap-2">
        <ImportanceBadge level={item.importance} />
        {item.categories[0] && <CategoryChip categoryKey={item.categories[0]} />}
      </div>
      <h3 className="text-lg font-bold leading-snug">
        <Link href={href(item)} className="hover:text-brand">
          {titleOf(item)}
        </Link>
      </h3>
      {item.summaryTh && <p className="line-clamp-3 text-[15px] leading-relaxed text-muted">{item.summaryTh}</p>}
      <Meta item={item} className="mt-auto" />
    </article>
  );
}

export function NewsRow({ item, showImportance = false }: { item: PublicNews; showImportance?: boolean }) {
  const cat = item.categories[0] ? getCategory(item.categories[0]) : undefined;
  return (
    <li className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-5 py-4 first:border-t-0 sm:px-6">
      {showImportance && (
        <div className="w-16 shrink-0">
          <ImportanceBadge level={item.importance} />
        </div>
      )}
      <div className="min-w-0 flex-[1_1_420px]">
        <Link href={href(item)} className="text-[17px] font-semibold leading-snug hover:text-brand">
          {titleOf(item)}
        </Link>
        {item.summaryTh && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{item.summaryTh}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1 text-[13px] text-muted sm:w-48">
        {cat && (
          <span className="inline-flex items-center gap-1.5">
            <GroupDot group={cat.group} />
            {cat.group}
          </span>
        )}
        <Meta item={item} />
      </div>
    </li>
  );
}

export function NewsList({ items, showImportance }: { items: PublicNews[]; showImportance?: boolean }) {
  return (
    <ul className={card}>
      {items.map((item) => (
        <NewsRow key={item.id} item={item} showImportance={showImportance} />
      ))}
    </ul>
  );
}
