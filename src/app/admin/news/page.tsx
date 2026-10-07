import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { checkBasicAuth } from "@/lib/adminAuth";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getGroupAccent } from "@/lib/groupAccent";
import { countByStatus, listByStatus } from "@/lib/news/repo";
import { NEWS_STATUSES, type NewsItem, type NewsStatus } from "@/lib/news/schema";
import { approveNews, moveToPending, rejectNews, saveAndApprove } from "./actions";

export const metadata: Metadata = {
  title: "อนุมัติข่าว AI | PromptPilot Admin",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<NewsStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  auto_rejected: "AI คัดออก",
};

const IMPORTANCE: Record<number, { label: string; className: string }> = {
  3: { label: "ด่วน", className: "border-rose-400/30 bg-rose-500/10 text-rose-300 light:text-rose-700" },
  2: { label: "ควรรู้", className: "border-amber-400/30 bg-amber-500/10 text-amber-300 light:text-amber-700" },
  1: { label: "ทั่วไป", className: "border-white/10 bg-white/[0.04] text-neutral-400 light:border-black/10 light:text-neutral-600" },
};

const pill = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs";
const btn = "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";
const btnPrimary = `${btn} border-emerald-400/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 light:text-emerald-700`;
const btnDanger = `${btn} border-rose-400/30 text-rose-300 hover:bg-rose-500/10 light:text-rose-700`;
const btnNeutral = `${btn} border-white/15 text-neutral-300 hover:bg-white/[0.06] light:border-black/15 light:text-neutral-700 light:hover:bg-black/[0.04]`;
const field =
  "w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-neutral-100 light:border-black/15 light:bg-white light:text-neutral-900";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

function IdForm({ action, label, className, id }: { action: (fd: FormData) => Promise<void>; label: string; className: string; id: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

function EditForm({ item }: { item: NewsItem }) {
  return (
    <details className="mt-4 rounded-xl border border-white/10 p-4 light:border-black/10">
      <summary className="cursor-pointer text-sm font-medium text-indigo-300 light:text-indigo-700">
        แก้ไขแล้วอนุมัติ
      </summary>
      <form action={saveAndApprove} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={item.id} />
        <label className="block space-y-1">
          <span className="text-xs text-neutral-400">หัวข้อภาษาไทย</span>
          <input name="titleTh" required maxLength={200} defaultValue={item.titleTh ?? item.title} className={field} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-neutral-400">คำสรุป (1–2 ประโยค ใช้เฉพาะข้อมูลจากต้นทาง)</span>
          <textarea name="summaryTh" required maxLength={1000} rows={3} defaultValue={item.summaryTh ?? ""} className={field} />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-xs text-neutral-400">หมวด (สูงสุด 3)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {CATEGORIES.map((c) => (
              <label key={c.key} className="flex items-center gap-1.5 text-sm text-neutral-300 light:text-neutral-700">
                <input type="checkbox" name="categories" value={c.key} defaultChecked={item.categories.includes(c.key)} />
                {c.titleTh}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block w-40 space-y-1">
          <span className="text-xs text-neutral-400">ความสำคัญ</span>
          <select name="importance" defaultValue={String(item.importance ?? 2)} className={field}>
            <option value="3">3 — ด่วน</option>
            <option value="2">2 — ควรรู้</option>
            <option value="1">1 — ทั่วไป</option>
          </select>
        </label>
        <button type="submit" className={btnPrimary}>
          บันทึกและอนุมัติ
        </button>
      </form>
    </details>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const imp = item.importance ? IMPORTANCE[item.importance] : null;
  const hasText = Boolean(item.titleTh && item.summaryTh);
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 light:border-black/10 light:bg-black/[0.02]">
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        {imp && <span className={`${pill} ${imp.className}`}>{imp.label}</span>}
        <span>{item.source}</span>
        <span>·</span>
        <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
      </div>

      <h2 className="mt-3 text-lg font-semibold text-neutral-50 light:text-neutral-900">
        {item.titleTh ?? <span className="text-neutral-500">(ยังไม่มีหัวข้อภาษาไทย)</span>}
      </h2>
      <p className="mt-1 text-sm text-neutral-300 light:text-neutral-700">
        {item.summaryTh ?? <span className="text-neutral-500">(ยังไม่มีคำสรุป — ต้องเขียนเองก่อนอนุมัติ)</span>}
      </p>

      {item.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.categories.map((key) => {
            const cat = getCategory(key);
            if (!cat) return null;
            return (
              <span key={key} className={`${pill} ${getGroupAccent(cat.group).badge}`}>
                {cat.titleTh}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-1 rounded-xl bg-black/20 p-3 text-xs text-neutral-400 light:bg-black/[0.04] light:text-neutral-600">
        <div>
          ต้นฉบับ:{" "}
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline light:text-indigo-700">
            {item.title}
          </a>
        </div>
        {item.snippet && <div className="line-clamp-3">เนื้อหาย่อ: {item.snippet}</div>}
        {item.aiReason && <div>เหตุผลของ AI: {item.aiReason}</div>}
        {item.reviewedBy && item.reviewedAt && (
          <div>
            ตรวจโดย {item.reviewedBy} เมื่อ {formatDate(item.reviewedAt)}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.status === "pending" && (
          <>
            {hasText && <IdForm action={approveNews} label="อนุมัติ" className={btnPrimary} id={item.id} />}
            <IdForm action={rejectNews} label="ปฏิเสธ" className={btnDanger} id={item.id} />
          </>
        )}
        {item.status === "approved" && <IdForm action={moveToPending} label="ถอนการอนุมัติ" className={btnNeutral} id={item.id} />}
        {(item.status === "rejected" || item.status === "auto_rejected") && (
          <IdForm action={moveToPending} label="ดึงกลับไปรออนุมัติ" className={btnNeutral} id={item.id} />
        )}
      </div>

      {(item.status === "pending" || item.status === "approved") && <EditForm item={item} />}
    </article>
  );
}

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  // proxy.ts กันไว้แล้ว — ตรวจซ้ำที่นี่เผื่อ matcher ถูกแก้จนหลุด
  if (!checkBasicAuth((await headers()).get("authorization"))) notFound();

  const { status: raw } = await searchParams;
  const status: NewsStatus = NEWS_STATUSES.includes(raw as NewsStatus) ? (raw as NewsStatus) : "pending";
  const counts = countByStatus();
  const items = listByStatus(status);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 light:text-neutral-900">อนุมัติข่าว AI</h1>
      <p className="mt-1 text-sm text-neutral-400 light:text-neutral-600">
        ข่าวที่ AI คัดและสรุปไว้ จะขึ้นหน้าเว็บก็ต่อเมื่ออนุมัติแล้วเท่านั้น ตรวจคำสรุปเทียบกับต้นฉบับก่อนกดอนุมัติ
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {NEWS_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/news?status=${s}`}
            className={`${btn} ${
              s === status
                ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200 light:text-indigo-700"
                : "border-white/10 text-neutral-400 hover:bg-white/[0.05] light:border-black/10 light:text-neutral-600"
            }`}
          >
            {STATUS_LABEL[s]} ({counts[s] ?? 0})
          </Link>
        ))}
      </nav>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-neutral-500 light:border-black/10">
            ไม่มีข่าวในสถานะ “{STATUS_LABEL[status]}”
          </p>
        ) : (
          items.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </div>
    </main>
  );
}
