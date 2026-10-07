import Link from "next/link";
import type { ReactNode } from "react";
import { getCategory } from "@/lib/categories";
import { getGroupAccent } from "@/lib/groupAccent";
import { IMPORTANCE_LABEL, TOOL_STATUS_LABEL, TOOL_STATUS_WARN } from "@/lib/labels";

export const card = "rounded-2xl border border-line bg-surface";

const IMPORTANCE_STYLE: Record<number, string> = {
  3: "bg-urgent-bg text-urgent font-semibold",
  2: "bg-warn-bg text-warn font-semibold",
  1: "bg-chip text-ink",
};

export function ImportanceBadge({ level }: { level: number | null }) {
  if (!level || !IMPORTANCE_LABEL[level]) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${IMPORTANCE_STYLE[level]}`}>
      {IMPORTANCE_LABEL[level]}
    </span>
  );
}

export function GroupDot({ group, className = "h-2 w-2 rounded-full" }: { group: string; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 ${className} ${getGroupAccent(group).dot}`} />;
}

export function CategoryChip({ categoryKey, link = false, onDark = false }: { categoryKey: string; link?: boolean; onDark?: boolean }) {
  const cat = getCategory(categoryKey);
  if (!cat) return null;
  const body = (
    <>
      <GroupDot group={cat.group} />
      {cat.titleTh}
    </>
  );
  const cls = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${onDark ? "bg-white/15 text-white backdrop-blur-sm" : "bg-chip text-ink"}`;
  return link ? (
    <Link href={`/guides/${cat.key}`} className={`${cls} ${onDark ? "hover:bg-white/25" : "hover:text-brand"}`}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}

export function ToolStatusBadge({ status }: { status: string }) {
  const warn = TOOL_STATUS_WARN.has(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${warn ? "bg-warn-bg text-warn" : "bg-good-bg text-good"}`}
    >
      {TOOL_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function SectionHeader({ id, title, href, linkLabel, children }: { id: string; title: string; href?: string; linkLabel?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-center gap-3 text-[22px] font-bold">
          <span aria-hidden className="h-6 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500" />
          {title}
        </h2>
        {children && <p className="mt-1 text-[15px] text-muted">{children}</p>}
      </div>
      {href && (
        <Link href={href} className="text-sm font-semibold text-brand hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={`${card} px-6 py-10 text-center text-[15px] text-muted`}>{children}</p>;
}

export function Breadcrumb({ items, onDark = false }: { items: { label: string; href?: string }[]; onDark?: boolean }) {
  return (
    <nav aria-label="breadcrumb" className={`text-sm ${onDark ? "text-white/75" : "text-muted"}`}>
      {items.map((it, i) => (
        <span key={it.label}>
          {i > 0 && " › "}
          {it.href ? (
            <Link href={it.href} className={onDark ? "hover:text-white" : "hover:text-brand"}>
              {it.label}
            </Link>
          ) : (
            <span aria-current="page">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
