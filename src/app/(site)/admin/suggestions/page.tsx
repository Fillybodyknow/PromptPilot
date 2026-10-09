import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminPage, EmptyState, FilterTabs } from "@/components/admin/AdminPage";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { card } from "@/components/site/ui";
import type { SuggestedChange } from "@/db/schema";
import { requireAdminPage } from "@/lib/adminSession";
import { listToolRows, type ToolRow } from "@/lib/catalog/admin";
import { toolRowToEntry } from "@/lib/catalog/repo";
import {
  countSuggestionsByStatus,
  listCheckRuns,
  listSuggestions,
  latestCheckRunFor,
  listNeedsManualCheck,
  type CheckRunRow,
  type SuggestionRow,
  type SuggestionStatus,
} from "@/lib/content/repo";
import { STALE_AFTER_DAYS } from "@/lib/content/schedule";
import { FIELD_LABEL, MANUAL_MARK, type ToolField } from "@/lib/content/toolCheck";
import { one, type SearchParams } from "@/lib/params";
import { accessMethodEnum, sourceLabelEnum, statusEnum } from "@/lib/schema";
import { acceptSuggestion, rejectSuggestion } from "./actions";

export const metadata: Metadata = { title: "ข้อเสนอแก้ไขจาก AI" };

const TABS: { key: SuggestionStatus; label: string }[] = [
  { key: "pending", label: "รอตรวจ" },
  { key: "accepted", label: "ใช้แล้ว" },
  { key: "partial", label: "ใช้บางส่วน" },
  { key: "rejected", label: "ปฏิเสธ" },
  { key: "superseded", label: "มีข้อเสนอใหม่กว่า" },
  { key: "expired", label: "หมดอายุ" },
];

const CONFIDENCE: Record<
  SuggestionRow["confidence"],
  { label: string; className: string }
> = {
  high: { label: "มั่นใจสูง", className: "bg-good-bg text-good" },
  medium: { label: "มั่นใจปานกลาง", className: "bg-warn-bg text-warn" },
  low: { label: "มั่นใจต่ำ", className: "bg-urgent-bg text-urgent" },
};

const TRIGGER: Record<SuggestionRow["trigger"], string> = {
  manual: "สั่งตรวจเอง",
  news: "มีข่าวเกี่ยวข้อง",
  stale: "ตรวจข้อมูลเก่าประจำสัปดาห์",
  monthly: "ตรวจรายเดือน",
};

const ENUM_OPTIONS: Record<string, readonly string[]> = {
  status: statusEnum.options,
  accessMethod: accessMethodEnum.options,
  sourceLabel: sourceLabelEnum.options,
};
const LONG_TEXT = new Set(["summary", "priceNote", "warning"]);

const fmtDate = (d: Date) =>
  d.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
const show = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v);
const asInput = (v: unknown) =>
  v === null || v === undefined ? "" : String(v);
const label = (field: string) => FIELD_LABEL[field as ToolField] ?? field;
const inputCls =
  "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm";

/** ใครสั่งตรวจ — รอบอัตโนมัติแสดงเป็นคำอธิบายแทนรหัส */
const runBy = (by: string) =>
  ({ "auto:news": "อัตโนมัติ: มีข่าวใหม่", "auto:stale": "อัตโนมัติ: ข้อมูลเก่า", ตั้งเวลา: "ตรวจอัตโนมัติประจำวัน" })[by] ?? by.replace(/^manual:/, "");

/** เครื่องมือที่ผลตรวจล่าสุดบอกว่า AI ตรวจแทนไม่ได้ — ต้องให้คนตั้งหน้าทางการที่ตรงกว่า หรือตรวจเอง */
function NeedsManualPanel({ items, tools }: { items: { toolId: number; message: string; at: Date }[]; tools: Map<string, ToolRow> }) {
  const rows = items.flatMap((i) => {
    const t = tools.get(String(i.toolId));
    return t ? [{ ...i, tool: t }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <details className="mt-10 rounded-2xl border border-warn/50 bg-warn-bg">
      <summary className="flex min-h-12 cursor-pointer items-center px-5 font-semibold text-warn">
        AI ตรวจแทนไม่ได้ {rows.length} เครื่องมือ — ต้องตั้งหน้าทางการที่ตรงกว่า หรือตรวจเอง
      </summary>
      <div className="border-t border-warn/30 px-5 pb-5 pt-3 text-sm">
        <p className="text-ink">
          หน้าที่ใช้ตรวจของเครื่องมือเหล่านี้เปิดไม่ได้ (กันบอท/โหลดด้วย JavaScript) หรือไม่มีข้อมูลของเครื่องมือนั้นโดยตรง กดชื่อแล้วใส่ลิงก์หน้าราคา/หน้าเอกสารของผู้ให้บริการในช่อง
          &quot;หน้าที่ใช้ตรวจ&quot; (ลองเปิดแบบไม่ login ดูก่อนว่าเห็นข้อความ) แล้วกด &quot;ให้ AI ตรวจตัวนี้&quot;
        </p>
        <ul className="mt-3 divide-y divide-warn/20">
          {rows.map((r) => (
            <li key={r.toolId} className="flex flex-col gap-0.5 py-2.5">
              <Link href={`/admin/tools/${r.toolId}`} className="font-semibold text-brand hover:underline">
                {r.tool.name}
              </Link>
              <span className="min-w-0 break-all text-[13px] text-muted">
                {fmtDate(r.at)} — {r.message.replace(`${r.tool.name}: `, "")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function RunPanel({ runs }: { runs: CheckRunRow[] }) {
  if (runs.length === 0) return null;
  const running = runs.some((r) => r.status === "running");
  return (
    <section className={`${card} mt-10 p-5 text-sm`}>
      <h2 className="font-semibold">
        การตรวจล่าสุด
        {/* ระหว่างตรวจ ให้หน้าโหลดผลใหม่เองจนกว่าจะเสร็จ (หยุดถ้ามีคนกำลังแก้ฟอร์ม) */}
        {running && <AutoRefresh />}
      </h2>
      <ul className="mt-2 space-y-1.5 text-muted">
        {runs.map((r) => (
          <li key={r.id} className="break-words">
            <span
              className={
                r.status === "failed"
                  ? "text-urgent"
                  : r.status === "running"
                    ? "text-brand"
                    : "text-good"
              }
            >
              {
                { running: "กำลังตรวจ…", ok: "เสร็จ", failed: "มีปัญหา" }[
                  r.status
                ]
              }
            </span>{" "}
            · {fmtDate(r.startedAt)} · {runBy(r.triggeredBy)} —{" "}
            {r.status === "running"
              ? r.scope === "auto"
                ? "ตรวจหลายเครื่องมือ อาจใช้เวลาหลายนาที หน้านี้โหลดผลใหม่เองทุก 10 วินาที"
                : "ใช้เวลาประมาณ 1 นาที หน้านี้โหลดผลใหม่เองทุก 10 วินาที"
              : r.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ValueEditor({ change }: { change: SuggestedChange }) {
  const name = `value_${change.field}`;
  const options = ENUM_OPTIONS[change.field];
  if (change.field === "verifiedAt")
    return <span className="font-medium">{show(change.after)}</span>;
  if (options)
    return (
      <select
        name={name}
        defaultValue={asInput(change.after)}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  if (LONG_TEXT.has(change.field))
    return (
      <textarea
        name={name}
        defaultValue={asInput(change.after)}
        rows={4}
        className={inputCls}
      />
    );
  return (
    <input
      name={name}
      defaultValue={asInput(change.after)}
      className={inputCls}
    />
  );
}

function Evidence({ change }: { change: SuggestedChange }) {
  return (
    <div className="mt-2 space-y-1 text-[13px] text-muted">
      {change.reason && <p>{change.reason}</p>}
      {change.quote && (
        <blockquote className="border-l-2 border-line pl-3 italic">
          “{change.quote}”
        </blockquote>
      )}
      {change.evidenceUrl && (
        <a
          href={change.evidenceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-brand hover:underline"
        >
          {change.evidenceUrl} ↗
        </a>
      )}
    </div>
  );
}

function SuggestionCard({
  s,
  tool,
}: {
  s: SuggestionRow;
  tool: ToolRow | undefined;
}) {
  const pending = s.status === "pending";
  const current = tool ? toolRowToEntry(tool) : {};
  const conf = CONFIDENCE[s.confidence];
  const rows = s.changes.map((c) => {
    // ข้อมูลถูกแก้ไปแล้วหลัง AI ตรวจ — ให้คนเห็นค่าปัจจุบันก่อนตัดสิน
    const now =
      c.field === "verifiedAt" ? current.verifiedAt : current[c.field];
    const drifted =
      pending &&
      tool &&
      JSON.stringify(now ?? null) !== JSON.stringify(c.before ?? null);
    return (
      <tr key={c.field} className="border-t border-line align-top">
        <td className="py-3 pr-3">
          {pending && tool ? (
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name={`apply_${c.field}`}
                defaultChecked
                className="mt-1 h-4 w-4"
              />
              <span className="font-medium">{label(c.field)}</span>
            </label>
          ) : (
            <span className="font-medium">{label(c.field)}</span>
          )}
        </td>
        <td className="max-w-[18rem] whitespace-pre-wrap break-words py-3 pr-3 text-muted">
          {show(c.before)}
          {drifted && (
            <p className="mt-1 text-xs text-warn">ตอนนี้เป็น: {show(now)}</p>
          )}
        </td>
        <td className="min-w-[14rem] py-3">
          {pending && tool ? (
            <ValueEditor change={c} />
          ) : (
            <span className="whitespace-pre-wrap break-words">
              {show(c.after)}
            </span>
          )}
          <Evidence change={c} />
        </td>
      </tr>
    );
  });

  const table = (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="pb-2 pr-3 font-normal">ช่อง</th>
            <th className="pb-2 pr-3 font-normal">ค่าเดิม</th>
            <th className="pb-2 font-normal">ค่าที่เสนอ</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  return (
    <article className={`${card} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">
          {tool ? (
            <Link href={`/admin/tools/${tool.id}`} className="hover:text-brand">
              {tool.name}
            </Link>
          ) : (
            `เครื่องมือ #${s.targetKey} (ถูกลบแล้ว)`
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-0.5 font-semibold ${conf.className}`}
          >
            {conf.label}
          </span>
          <span className="text-muted">
            {TRIGGER[s.trigger]} · {fmtDate(s.createdAt)}
          </span>
        </div>
      </div>
      {s.summary && <p className="mt-2 text-sm leading-relaxed">{s.summary}</p>}

      {pending ? (
        <>
          {tool ? (
            <ActionForm
              action={acceptSuggestion}
              submitLabel="ใช้รายการที่เลือก"
              pendingLabel="กำลังบันทึก…"
            >
              <input type="hidden" name="id" value={s.id} />
              {table}
              <p className="mt-3 text-xs text-muted">
                ตรวจกับลิงก์หลักฐานก่อนกด แก้ค่าได้ในช่อง
                และเอาติ๊กออกจากรายการที่ไม่ใช้ ·
                กดใช้แล้ววันที่ตรวจล่าสุดจะเป็นวันนี้
              </p>
            </ActionForm>
          ) : (
            table
          )}
          <details className="mt-4" open={!tool}>
            <summary className="cursor-pointer text-sm text-muted hover:text-ink">
              ปฏิเสธข้อเสนอนี้
            </summary>
            <ActionForm
              action={rejectSuggestion}
              submitLabel="ปฏิเสธ"
              variant="danger"
              pendingLabel="กำลังบันทึก…"
              className="mt-3"
            >
              <input type="hidden" name="id" value={s.id} />
              <input
                name="note"
                placeholder="เหตุผล (ไม่บังคับ) เช่น หลักฐานไม่ตรง ราคาเป็นของแผนอื่น"
                className={inputCls}
                maxLength={1000}
              />
            </ActionForm>
          </details>
        </>
      ) : (
        <>
          {table}
          {s.decidedAt && (
            <p className="mt-3 text-xs text-muted">
              ตัดสินโดย {s.decidedBy} · {fmtDate(s.decidedAt)}
              {s.decisionNote && ` · ${s.decisionNote}`}
            </p>
          )}
        </>
      )}
    </article>
  );
}

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const wanted = one((await searchParams).status);
  const status = TABS.find((t) => t.key === wanted)?.key ?? "pending";
  const [suggestions, counts, recentRuns, autoRun, toolRows, needsManual] = await Promise.all([
    listSuggestions(status),
    countSuggestionsByStatus(),
    listCheckRuns(8),
    latestCheckRunFor("auto"),
    listToolRows(),
    listNeedsManualCheck(MANUAL_MARK),
  ]);
  // รอบอัตโนมัติล่าสุดขึ้นก่อนเสมอ — ระหว่างรอบ ผลของแต่ละเครื่องมือถูกบันทึกเป็นแถวใหม่ จะดันแถวของรอบออกจากรายการล่าสุด
  const runs = [...(autoRun ? [autoRun] : []), ...recentRuns.filter((r) => r.id !== autoRun?.id && r.scope !== "auto:stale")].slice(0, 8);
  const tools = new Map(toolRows.map((t) => [String(t.id), t]));

  return (
    <AdminPage
      title="ข้อเสนอแก้ไขจาก AI"
      description={
        <>
          AI เทียบข้อมูลเครื่องมือกับหน้าทางการของผู้ให้บริการ แล้วเสนอสิ่งที่ควรแก้พร้อมหลักฐาน ข้อมูลบนเว็บจะเปลี่ยนเมื่อผู้ดูแลกดใช้เท่านั้น
          <br />
          ตรวจอัตโนมัติทุกเช้าสำหรับเครื่องมือที่มีข่าวใหม่ และสัปดาห์ละครั้งสำหรับเครื่องมือที่ข้อมูลเก่ากว่า {STALE_AFTER_DAYS} วัน · สั่งตรวจเองได้จากหน้าแก้ไขเครื่องมือ
        </>
      }
    >
      <FilterTabs
        label="สถานะข้อเสนอ"
        items={TABS.map((t) => ({
          href: t.key === "pending" ? "/admin/suggestions" : `/admin/suggestions?status=${t.key}`,
          label: t.label,
          count: counts[t.key] ?? 0,
          active: t.key === status,
          alert: t.key === "pending",
        }))}
      />

      <div className="mt-5 space-y-4">
        {suggestions.length === 0 ? (
          <EmptyState>{status === "pending" ? "ไม่มีข้อเสนอที่รอตรวจ" : "ยังไม่มีรายการ"}</EmptyState>
        ) : (
          suggestions.map((s) => <SuggestionCard key={s.id} s={s} tool={tools.get(s.targetKey)} />)
        )}
      </div>

      <NeedsManualPanel items={needsManual} tools={tools} />

      {/* ประวัติการตรวจอยู่ท้ายหน้า — งานหลักของหน้านี้คือรายการข้อเสนอ */}
      <RunPanel runs={runs} />
    </AdminPage>
  );
}
