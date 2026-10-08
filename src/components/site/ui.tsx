import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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
          <span aria-hidden className="sh-bar h-6 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500" />
          <span className="sh-title">{title}</span>
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

/** ตัวเลขที่นับขึ้นจาก 0 ด้วย CSS (ดู .count-up ใน globals.css) — screen reader อ่านค่าจริงจาก sr-only */
export function CountUp({ value }: { value: number }) {
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="count-up tabular-nums" style={{ "--n": value } as CSSProperties} />
    </>
  );
}

/**
 * คำที่สลับวนในหัวข้อ (CSS ล้วน ดู .rotating-words) — screen reader อ่านคำแรกคำเดียว
 * ถ้าปิดการเคลื่อนไหวจะเห็นแค่คำแรก ความกว้างเท่าคำที่ยาวที่สุดเสมอ ข้อความรอบๆ จึงไม่ขยับ
 */
export function RotatingWords({ words, period = 10 }: { words: string[]; period?: number }) {
  const step = period / words.length;
  return (
    <span className="rotating-words">
      <span className="sr-only">{words[0]}</span>
      {words.map((w, i) => (
        <span
          key={w}
          aria-hidden
          style={{ animationDuration: `${period}s, 6s`, animationDelay: `${i * step}s, 0s` }}
          className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-indigo-300 bg-clip-text pb-1 text-transparent"
        >
          {w}
        </span>
      ))}
    </span>
  );
}

const NEW_WITHIN_MS = 6 * 60 * 60 * 1000;

/** ป้าย "ใหม่" สำหรับข่าวที่เผยแพร่ภายใน 6 ชั่วโมง */
export function NewBadge({ publishedAt }: { publishedAt: string }) {
  // eslint-disable-next-line react-hooks/purity -- server component, คิดตอน render ต่อ request
  if (Date.now() - new Date(publishedAt).getTime() > NEW_WITHIN_MS) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-2.5 py-0.5 text-xs font-semibold text-good ring-1 ring-emerald-500/30">
      <span aria-hidden className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      ใหม่
    </span>
  );
}
