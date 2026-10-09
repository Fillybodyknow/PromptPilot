import type { Metadata } from "next";
import { AdminPage, btnDanger, btnNeutral, btnPrimary, EmptyState, FilterTabs, inputCls } from "@/components/admin/AdminPage";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { card, CategoryChip, ImportanceBadge } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { CATEGORIES } from "@/lib/categories";
import { loadToolIndex, type ToolRef } from "@/lib/catalog/repo";
import { publisherOf } from "@/lib/news/publisher";
import { countByStatus, duplicatesOf, getItemsByIds, latestRun, listByStatus, type FetchRun } from "@/lib/news/repo";
import { NEWS_STATUSES, type NewsItem, type NewsStatus } from "@/lib/news/schema";
import { getAutoApproveNews, type AutoApproveSetting } from "@/lib/settings";
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

const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
const label = "text-[13px] font-medium";

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
  running: { label: "กำลังดึงข่าว", className: "bg-brand-soft text-brand" },
  ok: { label: "สำเร็จ", className: "bg-good-bg text-good" },
  failed: { label: "มีปัญหา", className: "bg-urgent-bg text-urgent" },
};

const triggerLabel = (trigger: string) => (trigger.startsWith("manual:") ? `กดปุ่มโดย ${trigger.slice(7)}` : "ตั้งเวลาอัตโนมัติ");

function FetchPanel({ run }: { run: FetchRun | null }) {
  const running = run?.status === "running";
  return (
    <section className={`${card} flex flex-wrap items-start justify-between gap-4 p-5`}>
      <div className="min-w-0 flex-1 text-sm">
        <h2 className="font-semibold">
          ดึงข่าวรอบล่าสุด
          {/* ระหว่างดึงข่าว ให้หน้าโหลดผลใหม่เองจนกว่าจะเสร็จ (หยุดถ้ามีคนกำลังแก้ฟอร์มข่าว) */}
          {running && <AutoRefresh />}
        </h2>
        {run ? (
          <div className="mt-1.5 space-y-1 text-muted">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${pill} ${RUN_STATUS[run.status].className}`}>{RUN_STATUS[run.status].label}</span>
              <span>
                เริ่ม {formatDate(run.startedAt)} · {triggerLabel(run.trigger)}
              </span>
            </div>
            {running ? <p>ใช้เวลาประมาณ 1–2 นาที หน้านี้จะโหลดผลใหม่เองทุก 10 วินาที</p> : run.message && <p className="break-words">{run.message}</p>}
          </div>
        ) : (
          <p className="mt-1 text-muted">ยังไม่เคยดึงข่าว</p>
        )}
      </div>
      <form action={triggerFetch}>
        <button type="submit" disabled={running} className={btnPrimary}>
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
    <section className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-5 ${on ? "border-warn/50 bg-warn-bg" : "border-line bg-surface"}`}>
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">อนุมัติข่าวอัตโนมัติ</h2>
          <span className={`${pill} ${on ? "bg-warn text-background" : "bg-chip text-muted"}`}>{on ? "เปิดอยู่" : "ปิดอยู่"}</span>
        </div>
        <p className={`mt-1.5 leading-relaxed ${on ? "text-ink" : "text-muted"}`}>
          {on
            ? "ข่าวที่ AI คัดว่าเกี่ยวข้อง ไม่ซ้ำ และมีคำสรุปภาษาไทยครบ จะขึ้นหน้าเว็บทันทีที่ดึงมา (ภายใน 10 นาที) โดยไม่ต้องรอคนตรวจ — ตรวจย้อนหลังได้ในแท็บ “อนุมัติแล้ว” และกดถอนการอนุมัติเพื่อเอาลงได้"
            : "ทุกข่าวต้องมีคนตรวจและกดอนุมัติก่อนขึ้นหน้าเว็บ"}
        </p>
        <p className="mt-1 text-xs text-muted">
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
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${on ? "bg-warn" : "bg-line"}`}
          >
            <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </form>
      )}
    </section>
  );
}

function Check({ name, value, checked, children }: { name: string; value: string | number; checked: boolean; children: React.ReactNode }) {
  return (
    <label className="flex min-h-9 items-center gap-2 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4" />
      {children}
    </label>
  );
}

function EditForm({ item, tools }: { item: NewsItem; tools: ToolRef[] }) {
  // เสนอเครื่องมือในหมวดของข่าว + ตัวที่ผูกไว้แล้วก่อน ที่เหลือพับไว้ (มีหลายสิบตัว)
  const suggested = tools.filter((t) => item.categories.includes(t.categoryKey) || item.toolIds.includes(t.id));
  const others = tools.filter((t) => !suggested.includes(t));
  return (
    <details className="mt-4 rounded-xl border border-line">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-brand">แก้ไขแล้วอนุมัติ</summary>
      <form action={saveAndApprove} className="space-y-5 border-t border-line p-4">
        <input type="hidden" name="id" value={item.id} />
        <label className="block space-y-1.5">
          <span className={label}>หัวข้อภาษาไทย</span>
          <input name="titleTh" required maxLength={200} defaultValue={item.titleTh ?? item.title} className={`${inputCls} h-11`} />
        </label>
        <label className="block space-y-1.5">
          <span className={label}>คำสรุป (1–2 ประโยค ใช้เฉพาะข้อมูลจากต้นทาง)</span>
          <textarea name="summaryTh" required maxLength={1000} rows={3} defaultValue={item.summaryTh ?? ""} className={inputCls} />
        </label>
        <fieldset className="space-y-1.5">
          <legend className={label}>หมวด (สูงสุด 3)</legend>
          <div className="flex flex-wrap gap-x-5">
            {CATEGORIES.map((c) => (
              <Check key={c.key} name="categories" value={c.key} checked={item.categories.includes(c.key)}>
                {c.titleTh}
              </Check>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-1.5">
          <legend className={label}>เครื่องมือที่ข่าวนี้พูดถึง</legend>
          <p className="text-xs text-muted">AI เลือกไว้ ตรวจก่อนอนุมัติ — ข่าวจะแสดงในหน้าเครื่องมือที่เลือก</p>
          <div className="flex flex-wrap gap-x-5">
            {suggested.map((t) => (
              <Check key={t.id} name="toolIds" value={t.id} checked={item.toolIds.includes(t.id)}>
                {t.name}
              </Check>
            ))}
            {suggested.length === 0 && <span className="text-sm text-muted">ยังไม่มีเครื่องมือในหมวดของข่าวนี้</span>}
          </div>
          <details>
            <summary className="min-h-9 cursor-pointer py-2 text-sm text-muted hover:text-ink">เครื่องมือหมวดอื่น ({others.length})</summary>
            <div className="flex flex-wrap gap-x-5">
              {others.map((t) => (
                <Check key={t.id} name="toolIds" value={t.id} checked={false}>
                  {t.name}
                </Check>
              ))}
            </div>
          </details>
        </fieldset>
        <label className="block w-48 space-y-1.5">
          <span className={label}>ความสำคัญ</span>
          <select name="importance" defaultValue={String(item.importance ?? 2)} className={`${inputCls} h-11`}>
            <option value="3">ด่วน</option>
            <option value="2">ควรรู้</option>
            <option value="1">ทั่วไป</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={label}>ทำไมองค์กรควรสนใจ (แสดงบนหน้าเว็บ — เว้นว่างได้)</span>
          <textarea name="aiReason" maxLength={500} rows={2} defaultValue={item.aiReason ?? ""} className={inputCls} />
        </label>
        <fieldset className="space-y-3">
          <legend className={label}>สิ่งที่แต่ละบทบาทควรทำ</legend>
          <p className="text-xs text-muted">AI ร่างไว้ ตรวจและแก้ก่อนอนุมัติ — เว้นว่างได้ถ้าไม่เกี่ยว</p>
          {ROLE_FIELDS.map((r) => (
            <label key={r.name} className="block space-y-1.5">
              <span className="text-[13px] text-muted">{r.label}</span>
              <textarea name={r.name} maxLength={500} rows={2} defaultValue={item[r.name] ?? ""} className={inputCls} />
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
  const hasText = Boolean(item.titleTh && item.summaryTh);
  const roles = ROLE_FIELDS.filter((r) => item[r.name]);
  const linkedTools = tools.filter((t) => item.toolIds.includes(t.id));
  return (
    <article className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
        <ImportanceBadge level={item.importance} />
        <span className="font-medium text-ink">{item.source}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
      </div>

      <h2 className="mt-3 text-lg font-bold leading-snug">{item.titleTh ?? <span className="font-normal text-muted">(ยังไม่มีหัวข้อภาษาไทย)</span>}</h2>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {item.summaryTh ?? <span className="text-muted">(ยังไม่มีคำสรุป — ต้องเขียนเองก่อนอนุมัติ)</span>}
      </p>

      {item.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.categories.map((key) => (
            <CategoryChip key={key} categoryKey={key} />
          ))}
        </div>
      )}

      {(linkedTools.length > 0 || roles.length > 0) && (
        <dl className="mt-4 space-y-1.5 text-sm">
          {linkedTools.length > 0 && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">เครื่องมือที่พูดถึง:</dt>
              <dd className="text-muted">{linkedTools.map((t) => t.name).join(", ")}</dd>
            </div>
          )}
          {roles.map((r) => (
            <div key={r.name} className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">{r.label}:</dt>
              <dd className="min-w-0 flex-1 text-muted">{item[r.name]}</dd>
            </div>
          ))}
        </dl>
      )}

      {canonical && (
        <p className="mt-4 rounded-xl bg-warn-bg px-4 py-3 text-sm leading-relaxed text-warn">
          AI ผูกไว้ว่าเป็นเรื่องเดียวกับ: <strong>{canonical.titleTh ?? canonical.title}</strong> ({STATUS_LABEL[canonical.status]})
          {item.reviewedBy
            ? " — ยืนยันแล้ว แสดงเป็น “แหล่งอื่นที่รายงานเรื่องนี้” ใต้ข่าวนั้น"
            : " — ยังไม่ขึ้นหน้าเว็บจนกว่าจะยืนยัน ถ้าไม่ใช่เรื่องเดียวกันให้กดแยกเป็นข่าวใหม่"}
        </p>
      )}
      {duplicates.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          แหล่งอื่นที่รายงานเรื่องนี้ ({duplicates.length}
          {item.status !== "approved" && " — จะถือว่ายืนยันเมื่อกดอนุมัติข่าวนี้"}):{" "}
          {duplicates.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                {publisherOf(d)}
              </a>
              {!d.reviewedBy && " (ยังไม่ยืนยัน)"}
            </span>
          ))}
        </p>
      )}

      <div className="mt-4 space-y-1 rounded-xl bg-chip px-4 py-3 text-[13px] leading-relaxed text-muted">
        <p>
          ต้นฉบับ:{" "}
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
            {item.title}
          </a>
        </p>
        {item.snippet && <p className="line-clamp-3">เนื้อหาย่อ: {item.snippet}</p>}
        {item.aiReason && <p>เหตุผลของ AI: {item.aiReason}</p>}
        {item.reviewedBy && item.reviewedAt && (
          <p>
            ตรวจโดย {item.reviewedBy} เมื่อ {formatDate(item.reviewedAt)}
          </p>
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
        {item.status === "duplicate" && <IdForm action={separateFromStory} label="แยกเป็นข่าวใหม่" className={btnNeutral} id={item.id} />}
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
    <AdminPage title="อนุมัติข่าว AI" description="ข่าวที่ AI คัดและสรุปไว้ จะขึ้นหน้าเว็บก็ต่อเมื่ออนุมัติแล้วเท่านั้น ตรวจคำสรุปเทียบกับต้นฉบับก่อนกดอนุมัติ">
      <div className="grid gap-3 xl:grid-cols-2">
        <FetchPanel run={run} />
        <AutoApprovePanel setting={autoApprove} canChange={me.role === "admin"} />
      </div>

      <div className="mt-8">
        <FilterTabs
          label="สถานะข่าว"
          items={NEWS_STATUSES.map((s) => ({
            href: s === "pending" ? "/admin/news" : `/admin/news?status=${s}`,
            label: STATUS_LABEL[s],
            count: counts[s] ?? 0,
            active: s === status,
            alert: s === "pending",
          }))}
        />
      </div>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <EmptyState>ไม่มีข่าวในสถานะ “{STATUS_LABEL[status]}”</EmptyState>
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
    </AdminPage>
  );
}
