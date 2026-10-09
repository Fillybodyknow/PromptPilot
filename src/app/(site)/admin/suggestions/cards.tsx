import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { btnPrimary, inputCls } from "@/components/admin/AdminPage";
import { card } from "@/components/site/ui";
import type { SuggestedChange } from "@/db/schema";
import type { ToolRow } from "@/lib/catalog/admin";
import { toolRowToEntry } from "@/lib/catalog/repo";
import { getCategory } from "@/lib/categories";
import { GUIDE_FIELD_LABEL } from "@/lib/labels";
import type { SuggestionRow } from "@/lib/content/repo";
import { FIELD_LABEL } from "@/lib/content/toolCheck";
import { accessMethodEnum, sourceLabelEnum, statusEnum } from "@/lib/schema";
import { diffWords } from "@/lib/textDiff";
import { acceptSuggestion, rejectSuggestion } from "./actions";

const CONFIDENCE: Record<SuggestionRow["confidence"], { label: string; className: string }> = {
  high: { label: "มั่นใจสูง", className: "bg-good-bg text-good" },
  medium: { label: "มั่นใจปานกลาง", className: "bg-warn-bg text-warn" },
  low: { label: "มั่นใจต่ำ", className: "bg-urgent-bg text-urgent" },
};

const TRIGGER: Record<SuggestionRow["trigger"], string> = {
  manual: "สั่งตรวจเอง",
  news: "มีข่าวเกี่ยวข้อง",
  stale: "ตรวจข้อมูลเก่าประจำสัปดาห์",
  monthly: "ทบทวนรายเดือน",
};

export const TYPE_LABEL: Record<SuggestionRow["targetType"], string> = {
  tool: "แก้ข้อมูลเครื่องมือ",
  guide: "แก้คู่มือ",
  prompt: "prompt ใหม่",
  new_tool: "เครื่องมือใหม่",
};

const ENUM_OPTIONS: Record<string, readonly string[]> = {
  status: statusEnum.options,
  accessMethod: accessMethodEnum.options,
  sourceLabel: sourceLabelEnum.options,
};
/** ช่องข้อความยาว — แสดงแบบไฮไลต์คำที่เปลี่ยน และแก้ในกล่องข้อความใหญ่ */
const LONG_TEXT = new Set(["summary", "priceNote", "warning", ...Object.keys(GUIDE_FIELD_LABEL)]);

export const fmtDate = (d: Date) => d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const asInput = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const fieldLabel = (f: string) => (FIELD_LABEL as Record<string, string>)[f] ?? (GUIDE_FIELD_LABEL as Record<string, string>)[f] ?? f;

/** ข้อความเดิม → ใหม่ โดยขีดฆ่าคำที่ถูกตัดและไฮไลต์คำที่เพิ่ม */
function DiffText({ before, after }: { before: unknown; after: unknown }) {
  const parts = diffWords(asInput(before), asInput(after));
  return (
    <p className="whitespace-pre-wrap break-words rounded-lg bg-chip px-3 py-2 text-sm leading-relaxed">
      {parts.map((p, i) =>
        p.kind === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.kind === "add" ? (
          <ins key={i} className="rounded bg-good-bg text-good no-underline">
            {p.text}
          </ins>
        ) : (
          <del key={i} className="rounded bg-urgent-bg text-urgent">
            {p.text}
          </del>
        ),
      )}
    </p>
  );
}

function Evidence({ change }: { change: SuggestedChange }) {
  return (
    <div className="mt-2 space-y-1 text-[13px] text-muted">
      {change.reason && <p>{change.reason}</p>}
      {change.quote && <blockquote className="border-l-2 border-line pl-3 italic">“{change.quote}”</blockquote>}
      {change.evidenceUrl && (
        <a href={change.evidenceUrl} target="_blank" rel="noreferrer noopener" className="break-all text-brand hover:underline">
          {change.evidenceUrl} ↗
        </a>
      )}
    </div>
  );
}

function ValueEditor({ change }: { change: SuggestedChange }) {
  const name = `value_${change.field}`;
  const options = ENUM_OPTIONS[change.field];
  if (change.field === "verifiedAt") return <span className="font-medium">{show(change.after)}</span>;
  if (options)
    return (
      <select name={name} defaultValue={asInput(change.after)} className={inputCls}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  if (LONG_TEXT.has(change.field)) return <textarea name={name} defaultValue={asInput(change.after)} rows={5} className={inputCls} aria-label={`ค่าใหม่ของ ${fieldLabel(change.field)}`} />;
  return <input name={name} defaultValue={asInput(change.after)} className={inputCls} aria-label={`ค่าใหม่ของ ${fieldLabel(change.field)}`} />;
}

/** หัวการ์ด: ชื่อเป้าหมาย + ประเภท + ความมั่นใจ + ที่มา */
function CardHead({ s, title }: { s: SuggestionRow; title: ReactNode }) {
  const conf = CONFIDENCE[s.confidence];
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{TYPE_LABEL[s.targetType]}</p>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${conf.className}`}>{conf.label}</span>
          <span className="text-muted">
            {TRIGGER[s.trigger]} · {fmtDate(s.createdAt)}
          </span>
        </div>
      </div>
      {s.summary && <p className="mt-2 text-sm leading-relaxed">{s.summary}</p>}
    </>
  );
}

function RejectForm({ s, open = false }: { s: SuggestionRow; open?: boolean }) {
  return (
    <details className="mt-4" open={open}>
      <summary className="cursor-pointer text-sm text-muted hover:text-ink">ปฏิเสธข้อเสนอนี้</summary>
      <ActionForm action={rejectSuggestion} submitLabel="ปฏิเสธ" variant="danger" pendingLabel="กำลังบันทึก…" className="mt-3">
        <input type="hidden" name="id" value={s.id} />
        <input name="note" placeholder="เหตุผล (ไม่บังคับ) เช่น หลักฐานไม่ตรง ไม่เกี่ยวกับงานของเรา" className={inputCls} maxLength={1000} />
      </ActionForm>
    </details>
  );
}

function Decided({ s }: { s: SuggestionRow }) {
  if (!s.decidedAt) return null;
  return (
    <p className="mt-3 text-xs text-muted">
      ตัดสินโดย {s.decidedBy} · {fmtDate(s.decidedAt)}
      {s.decisionNote && ` · ${s.decisionNote}`}
    </p>
  );
}

/**
 * ข้อเสนอแก้ข้อมูล (เครื่องมือหรือคู่มือ): ตารางทีละช่อง — ติ๊กเลือก แก้ค่าได้ ข้อความยาวแสดงส่วนที่เปลี่ยน
 * current = ข้อมูลปัจจุบันของเป้าหมาย (เตือนเมื่อถูกแก้ไปแล้วหลัง AI ตรวจ) — null = เป้าหมายถูกลบแล้ว
 */
function FieldChangeCard({ s, title, current, footnote }: { s: SuggestionRow; title: ReactNode; current: Record<string, unknown> | null; footnote: string }) {
  const editable = s.status === "pending" && current !== null;
  const rows = s.changes.map((c) => {
    const now = current?.[c.field];
    const drifted = editable && JSON.stringify(now ?? null) !== JSON.stringify(c.before ?? null);
    const long = LONG_TEXT.has(c.field) && (c.before || c.after);
    return (
      <li key={c.field} className="border-t border-line py-4 first:border-t-0 first:pt-0">
        {editable ? (
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" name={`apply_${c.field}`} defaultChecked className="h-4 w-4" />
            {fieldLabel(c.field)}
          </label>
        ) : (
          <p className="font-semibold">{fieldLabel(c.field)}</p>
        )}
        {drifted && <p className="mt-1 text-xs text-warn">ข้อมูลช่องนี้ถูกแก้หลังจาก AI ตรวจ — ตอนนี้เป็น: {show(now)}</p>}
        {long ? (
          <div className="mt-2 space-y-2">
            {/* ช่องใหม่ (ไม่มีค่าเดิม) ที่แก้ได้ — กล่องข้อความแสดงทั้งหมดอยู่แล้ว ไม่ต้องไฮไลต์ซ้ำ */}
            {(c.before || !editable) && <DiffText before={c.before} after={c.after} />}
            {!c.before && editable && <p className="text-xs font-semibold text-good">เพิ่มใหม่</p>}
            {editable && <ValueEditor change={c} />}
          </div>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="text-sm">
              <span className="text-xs text-muted">ค่าเดิม</span>
              <p className="break-words text-muted line-through decoration-urgent/50">{show(c.before)}</p>
            </div>
            <div className="text-sm">
              <span className="text-xs text-muted">ค่าที่เสนอ</span>
              {editable ? <ValueEditor change={c} /> : <p className="break-words font-medium">{show(c.after)}</p>}
            </div>
          </div>
        )}
        <Evidence change={c} />
      </li>
    );
  });
  const list = <ul className="mt-4">{rows}</ul>;
  return (
    <article className={`${card} p-5`}>
      <CardHead s={s} title={title} />
      {editable ? (
        <ActionForm action={acceptSuggestion} submitLabel="ใช้รายการที่เลือก" pendingLabel="กำลังบันทึก…">
          <input type="hidden" name="id" value={s.id} />
          {list}
          <p className="mt-1 text-xs text-muted">{footnote}</p>
        </ActionForm>
      ) : (
        list
      )}
      {s.status === "pending" ? <RejectForm s={s} open={current === null} /> : <Decided s={s} />}
    </article>
  );
}

function PromptCard({ s }: { s: SuggestionRow }) {
  const c = s.changes[0];
  const p = (c?.after ?? {}) as Record<string, string | undefined>;
  const category = getCategory(s.targetKey);
  const title = (
    <>
      {p.task}
      <span className="ml-2 text-sm font-normal text-muted">
        หมวด{" "}
        <Link href={`/admin/guides/${s.targetKey}`} className="text-brand hover:underline">
          {category?.titleTh ?? s.targetKey}
        </Link>
      </span>
    </>
  );
  const fields = [
    { key: "task", label: "งาน", rows: 1 },
    { key: "goodPrompt", label: "prompt ที่ดี", rows: 8 },
    { key: "badPrompt", label: "ตัวอย่างที่ไม่ดี (ไม่บังคับ)", rows: 2 },
    { key: "why", label: "ทำไมได้ผล", rows: 3 },
    { key: "draftNote", label: "ควรทดสอบอย่างไร (ร่าง)", rows: 2 },
  ];
  return (
    <article className={`${card} p-5`}>
      <CardHead s={s} title={title} />
      {s.status === "pending" ? (
        <>
          <ActionForm action={acceptSuggestion} submitLabel="เพิ่มเป็น prompt ร่าง" pendingLabel="กำลังบันทึก…" className="mt-4">
            <input type="hidden" name="id" value={s.id} />
            <div className="space-y-3">
              {fields.map((f) => (
                <label key={f.key} className="block space-y-1">
                  <span className="text-[13px] font-medium">{f.label}</span>
                  {f.rows === 1 ? (
                    <input name={`prompt_${f.key}`} defaultValue={p[f.key] ?? ""} className={`${inputCls} h-11`} />
                  ) : (
                    <textarea name={`prompt_${f.key}`} defaultValue={p[f.key] ?? ""} rows={f.rows} className={inputCls} />
                  )}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">แก้ข้อความได้ก่อนกด · prompt จะขึ้นเว็บในสถานะ &quot;ร่าง&quot; จนกว่าจะมีคนทดสอบแล้วแก้สถานะในหน้าคู่มือ</p>
          </ActionForm>
          <RejectForm s={s} />
        </>
      ) : (
        <>
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-chip p-3 text-sm">{p.goodPrompt}</pre>
          <Decided s={s} />
        </>
      )}
    </article>
  );
}

function NewToolCard({ s }: { s: SuggestionRow }) {
  const c = s.changes[0];
  const t = (c?.after ?? {}) as { name?: string; vendor?: string; url?: string | null; summary?: string };
  const category = getCategory(s.targetKey);
  return (
    <article className={`${card} p-5`}>
      <CardHead
        s={s}
        title={
          <>
            {t.name}
            {t.vendor && <span className="ml-2 text-sm font-normal text-muted">โดย {t.vendor}</span>}
          </>
        }
      />
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">หมวด:</dt>
          <dd>{category?.titleTh ?? s.targetKey}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">เว็บทางการ:</dt>
          <dd className="min-w-0 break-all">
            {t.url ? (
              <a href={t.url} target="_blank" rel="noreferrer noopener" className="text-brand hover:underline">
                {t.url} ↗
              </a>
            ) : (
              <span className="text-warn">AI ไม่แน่ใจ — ต้องหาเอง</span>
            )}
          </dd>
        </div>
        {t.summary && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold">คืออะไร:</dt>
            <dd className="min-w-0 flex-1">{t.summary}</dd>
          </div>
        )}
      </dl>
      {c && <Evidence change={c} />}
      {s.status === "pending" ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={`/admin/tools/new?category=${s.targetKey}&suggestion=${s.id}`} className={btnPrimary}>
              สร้างเครื่องมือจากข้อเสนอนี้ →
            </Link>
            <span className="text-xs text-muted">เปิดฟอร์มเพิ่มเครื่องมือที่กรอกชื่อ ผู้ให้บริการ ลิงก์ และสรุปไว้ให้ — ข้อเสนอปิดเองเมื่อบันทึก</span>
          </div>
          <RejectForm s={s} />
        </>
      ) : (
        <Decided s={s} />
      )}
    </article>
  );
}

export function SuggestionCard({ s, tool, guide }: { s: SuggestionRow; tool?: ToolRow; guide?: Record<string, unknown> }) {
  if (s.targetType === "prompt") return <PromptCard s={s} />;
  if (s.targetType === "new_tool") return <NewToolCard s={s} />;
  if (s.targetType === "guide") {
    const category = getCategory(s.targetKey);
    return (
      <FieldChangeCard
        s={s}
        current={guide ?? null}
        footnote="ตรวจกับข่าวที่อ้างก่อนกด แก้ข้อความได้ในกล่อง และเอาติ๊กออกจากรายการที่ไม่ใช้"
        title={
          <Link href={`/admin/guides/${s.targetKey}`} className="hover:text-brand">
            คู่มือ {category?.titleTh ?? s.targetKey}
          </Link>
        }
      />
    );
  }
  return (
    <FieldChangeCard
      s={s}
      current={tool ? { ...toolRowToEntry(tool), verifiedAt: tool.verifiedAt } : null}
      footnote="ตรวจกับลิงก์หลักฐานก่อนกด แก้ค่าได้ในช่อง และเอาติ๊กออกจากรายการที่ไม่ใช้ · กดใช้แล้ววันที่ตรวจล่าสุดจะเป็นวันนี้"
      title={
        tool ? (
          <Link href={`/admin/tools/${tool.id}`} className="hover:text-brand">
            {tool.name}
          </Link>
        ) : (
          `เครื่องมือ #${s.targetKey} (ถูกลบแล้ว)`
        )
      }
    />
  );
}
