import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/adminSession";
import { getAutoApproveNews, type AutoApproveSetting } from "@/lib/settings";
import Link from "next/link";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getGroupAccent } from "@/lib/groupAccent";
import { loadToolIndex, type ToolRef } from "@/lib/catalog/repo";
import { countByStatus, duplicatesOf, getItemsByIds, latestRun, listByStatus, type FetchRun } from "@/lib/news/repo";
import { NEWS_STATUSES, type NewsItem, type NewsStatus } from "@/lib/news/schema";
import { publisherOf } from "@/lib/news/publisher";
import {
  approveNews,
  confirmDuplicateStory,
  moveToPending,
  rejectNews,
  saveAndApprove,
  separateFromStory,
  setAutoApprove,
  triggerFetch,
} from "./actions";

export const metadata: Metadata = {
  title: "อนุมัติข่าว AI | PromptPilot Admin",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<NewsStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  auto_rejected: "AI คัดออก",
  duplicate: "ข่าวซ้ำ",
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

const RUN_STATUS: Record<FetchRun["status"], { label: string; className: string }> = {
  running: { label: "กำลังดึงข่าว", className: "border-sky-400/30 bg-sky-500/10 text-sky-300 light:text-sky-700" },
  ok: { label: "สำเร็จ", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 light:text-emerald-700" },
  failed: { label: "มีปัญหา", className: "border-rose-400/30 bg-rose-500/10 text-rose-300 light:text-rose-700" },
};

const triggerLabel = (trigger: string) =>
  trigger.startsWith("manual:") ? `กดปุ่มโดย ${trigger.slice(7)}` : "ตั้งเวลาอัตโนมัติ";

function FetchPanel({ run }: { run: FetchRun | null }) {
  const running = run?.status === "running";
  return (
    <section className="mt-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 light:border-black/10 light:bg-black/[0.02]">
      {/* ระหว่างดึงข่าว ให้หน้ารีเฟรชเองจนกว่าจะเสร็จ — ไม่ต้องใช้ JavaScript ฝั่ง client */}
      {running && <meta httpEquiv="refresh" content="10" />}
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium text-neutral-100 light:text-neutral-900">ดึงข่าวรอบล่าสุด</div>
        {run ? (
          <div className="mt-1 space-y-1 text-neutral-400 light:text-neutral-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${pill} ${RUN_STATUS[run.status].className}`}>{RUN_STATUS[run.status].label}</span>
              <span>
                เริ่ม {formatDate(run.startedAt)} · {triggerLabel(run.trigger)}
              </span>
            </div>
            {running ? (
              <div>ใช้เวลาประมาณ 1–2 นาที หน้านี้จะรีเฟรชเองทุก 10 วินาที</div>
            ) : (
              run.message && <div className="break-words">{run.message}</div>
            )}
          </div>
        ) : (
          <div className="mt-1 text-neutral-500">ยังไม่เคยดึงข่าว</div>
        )}
      </div>
      <form action={triggerFetch}>
        <button type="submit" disabled={running} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}>
          {running ? "กำลังดึงข่าว…" : "ดึงข่าวล่าสุดตอนนี้"}
        </button>
      </form>
    </section>
  );
}

/** สวิตช์อนุมัติข่าวอัตโนมัติ — ผู้ดูแลเนื้อหาเห็นสถานะ แต่เปลี่ยนได้เฉพาะผู้ดูแลระบบ */
function AutoApprovePanel({ setting, canChange }: { setting: AutoApproveSetting; canChange: boolean }) {
  const on = setting.enabled;
  return (
    <section
      className={`mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-5 ${
        on ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.03] light:border-black/10 light:bg-black/[0.02]"
      }`}
    >
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-neutral-100 light:text-neutral-900">อนุมัติข่าวอัตโนมัติ</span>
          <span className={`${pill} ${on ? "border-amber-400/40 text-amber-300 light:text-amber-700" : "border-white/15 text-neutral-400 light:border-black/15 light:text-neutral-600"}`}>
            {on ? "เปิดอยู่" : "ปิดอยู่"}
          </span>
        </div>
        <p className="mt-1 text-neutral-400 light:text-neutral-600">
          {on
            ? "ข่าวที่ AI คัดว่าเกี่ยวข้อง ไม่ซ้ำ และมีคำสรุปภาษาไทยครบ จะขึ้นหน้าเว็บทันทีที่ดึงมา (ภายใน 10 นาที) โดยไม่ต้องรอคนตรวจ — ตรวจย้อนหลังได้ในแท็บ “อนุมัติแล้ว” และกดปฏิเสธเพื่อเอาลงได้"
            : "ทุกข่าวต้องมีคนตรวจและกดอนุมัติก่อนขึ้นหน้าเว็บ"}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          มีผลกับรอบดึงข่าวถัดไป ข่าวที่รออนุมัติอยู่แล้วไม่เปลี่ยน
          {setting.updatedAt && ` · เปลี่ยนล่าสุดโดย ${setting.updatedBy ?? "-"} เมื่อ ${formatDate(setting.updatedAt.toISOString())}`}
          {!canChange && " · เปลี่ยนได้เฉพาะผู้ดูแลระบบ"}
        </p>
      </div>
      {canChange && (
        <form action={setAutoApprove}>
          <input type="hidden" name="enabled" value={on ? "0" : "1"} />
          <button
            type="submit"
            role="switch"
            aria-checked={on}
            aria-label="อนุมัติข่าวอัตโนมัติ"
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${on ? "bg-amber-500" : "bg-neutral-600 light:bg-neutral-300"}`}
          >
            <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </form>
      )}
    </section>
  );
}

function ToolCheckbox({ tool, checked }: { tool: ToolRef; checked: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-neutral-300 light:text-neutral-700">
      <input type="checkbox" name="toolIds" value={tool.id} defaultChecked={checked} />
      {tool.name}
    </label>
  );
}

function EditForm({ item, tools }: { item: NewsItem; tools: ToolRef[] }) {
  // เสนอเครื่องมือในหมวดของข่าว + ตัวที่ผูกไว้แล้วก่อน ที่เหลือพับไว้ (มีหลายสิบตัว)
  const suggested = tools.filter((t) => item.categories.includes(t.categoryKey) || item.toolIds.includes(t.id));
  const others = tools.filter((t) => !suggested.includes(t));
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
        <fieldset className="space-y-2">
          <legend className="text-xs text-neutral-400">เครื่องมือที่ข่าวนี้พูดถึง (AI เลือกไว้ ตรวจก่อนอนุมัติ — แสดงในหน้าเครื่องมือนั้น)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {suggested.map((t) => (
              <ToolCheckbox key={t.id} tool={t} checked={item.toolIds.includes(t.id)} />
            ))}
            {suggested.length === 0 && <span className="text-sm text-neutral-500">ยังไม่มีเครื่องมือในหมวดของข่าวนี้</span>}
          </div>
          <details>
            <summary className="cursor-pointer text-xs text-neutral-400">เครื่องมือหมวดอื่น ({others.length})</summary>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {others.map((t) => (
                <ToolCheckbox key={t.id} tool={t} checked={false} />
              ))}
            </div>
          </details>
        </fieldset>
        <label className="block w-40 space-y-1">
          <span className="text-xs text-neutral-400">ความสำคัญ</span>
          <select name="importance" defaultValue={String(item.importance ?? 2)} className={field}>
            <option value="3">3 — ด่วน</option>
            <option value="2">2 — ควรรู้</option>
            <option value="1">1 — ทั่วไป</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-neutral-400">ทำไมองค์กรควรสนใจ (แสดงบนหน้าเว็บ — เว้นว่างได้)</span>
          <textarea name="aiReason" maxLength={500} rows={2} defaultValue={item.aiReason ?? ""} className={field} />
        </label>
        <fieldset className="space-y-3">
          <legend className="text-xs text-neutral-400">สิ่งที่แต่ละบทบาทควรทำ (AI ร่างไว้ ตรวจและแก้ก่อนอนุมัติ — เว้นว่างได้ถ้าไม่เกี่ยว)</legend>
          {ROLE_FIELDS.map((r) => (
            <label key={r.name} className="block space-y-1">
              <span className="text-xs text-neutral-400">{r.label}</span>
              <textarea name={r.name} maxLength={500} rows={2} defaultValue={item[r.name] ?? ""} className={field} />
            </label>
          ))}
        </fieldset>
        <button type="submit" className={btnPrimary}>
          บันทึกและอนุมัติ
        </button>
      </form>
    </details>
  );
}

const ROLE_FIELDS = [
  { name: "roleEmployee", label: "พนักงานทั่วไป" },
  { name: "roleIt", label: "ฝ่าย IT" },
  { name: "roleExec", label: "ผู้บริหาร" },
] as const;

function NewsCard({ item, duplicates, canonical, tools }: { item: NewsItem; duplicates: NewsItem[]; canonical?: NewsItem; tools: ToolRef[] }) {
  const imp = item.importance ? IMPORTANCE[item.importance] : null;
  const hasText = Boolean(item.titleTh && item.summaryTh);
  const roles = ROLE_FIELDS.filter((r) => item[r.name]);
  const linkedTools = tools.filter((t) => item.toolIds.includes(t.id));
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

      {linkedTools.length > 0 && (
        <p className="mt-3 text-sm text-neutral-400 light:text-neutral-600">
          เครื่องมือที่พูดถึง: {linkedTools.map((t) => t.name).join(", ")}
        </p>
      )}
      {roles.length > 0 && (
        <dl className="mt-3 space-y-1 text-sm">
          {roles.map((r) => (
            <div key={r.name} className="flex gap-2">
              <dt className="shrink-0 font-medium text-neutral-300 light:text-neutral-700">{r.label}:</dt>
              <dd className="text-neutral-400 light:text-neutral-600">{item[r.name]}</dd>
            </div>
          ))}
        </dl>
      )}

      {canonical && (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 light:text-amber-800">
          AI ผูกไว้ว่าเป็นเรื่องเดียวกับ: <strong>{canonical.titleTh ?? canonical.title}</strong> ({STATUS_LABEL[canonical.status]})
          {item.reviewedBy
            ? " — ยืนยันแล้ว แสดงเป็น “แหล่งอื่นที่รายงานเรื่องนี้” ใต้ข่าวนั้น"
            : " — ยังไม่ขึ้นหน้าเว็บจนกว่าจะยืนยัน ถ้าไม่ใช่เรื่องเดียวกันให้กดแยกเป็นข่าวใหม่"}
        </p>
      )}
      {duplicates.length > 0 && (
        <div className="mt-3 text-sm text-neutral-400 light:text-neutral-600">
          แหล่งอื่นที่รายงานเรื่องนี้ ({duplicates.length}
          {item.status !== "approved" && " — จะถือว่ายืนยันเมื่อกดอนุมัติข่าวนี้"}):{" "}
          {duplicates.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">
                {publisherOf(d)}
              </a>
              {!d.reviewedBy && " (ยังไม่ยืนยัน)"}
            </span>
          ))}
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
        {item.status === "duplicate" && !item.reviewedBy && (
          <IdForm action={confirmDuplicateStory} label="ยืนยันว่าเป็นเรื่องเดียวกัน" className={btnPrimary} id={item.id} />
        )}
        {item.status === "duplicate" && (
          <IdForm action={separateFromStory} label="แยกเป็นข่าวใหม่" className={btnNeutral} id={item.id} />
        )}
      </div>

      {(item.status === "pending" || item.status === "approved") && <EditForm item={item} tools={tools} />}
    </article>
  );
}

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  // proxy.ts กันไว้แล้ว — ตรวจซ้ำที่นี่เผื่อ matcher ถูกแก้จนหลุด
  const me = await requireAdminPage();

  const { status: raw } = await searchParams;
  const status: NewsStatus = NEWS_STATUSES.includes(raw as NewsStatus) ? (raw as NewsStatus) : "pending";
  const [counts, items, run, autoApprove] = await Promise.all([countByStatus(), listByStatus(status), latestRun(), getAutoApproveNews()]);
  const [dups, canonicals, tools] = await Promise.all([
    duplicatesOf(items.map((i) => i.id)),
    getItemsByIds(items.flatMap((i) => (i.duplicateOf ? [i.duplicateOf] : []))),
    loadToolIndex(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 light:text-neutral-900">อนุมัติข่าว AI</h1>
      <p className="mt-1 text-sm text-neutral-400 light:text-neutral-600">
        ข่าวที่ AI คัดและสรุปไว้ จะขึ้นหน้าเว็บก็ต่อเมื่ออนุมัติแล้วเท่านั้น ตรวจคำสรุปเทียบกับต้นฉบับก่อนกดอนุมัติ
      </p>

      <FetchPanel run={run} />
      <AutoApprovePanel setting={autoApprove} canChange={me.role === "admin"} />

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
          items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              duplicates={dups.get(item.id) ?? []}
              canonical={item.duplicateOf ? canonicals.get(item.duplicateOf) : undefined}
              tools={tools}
            />
          ))
        )}
      </div>
    </main>
  );
}
