import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, EmptyState, FilterTabs } from "@/components/admin/AdminPage";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { listToolRows, type ToolRow } from "@/lib/catalog/admin";
import { loadAllGuides } from "@/lib/catalog/repo";
import {
  countPendingByType,
  countSuggestionsByStatus,
  latestCheckRunFor,
  listCheckRuns,
  listNeedsManualCheck,
  listSuggestions,
  type CheckRunRow,
  type SuggestionStatus,
  type SuggestionTarget,
} from "@/lib/content/repo";
import { STALE_AFTER_DAYS } from "@/lib/content/schedule";
import { MANUAL_MARK } from "@/lib/content/toolCheck";
import { one, type SearchParams } from "@/lib/params";
import { fmtDate, SuggestionCard, TYPE_LABEL } from "./cards";

export const metadata: Metadata = { title: "ข้อเสนอแก้ไขจาก AI" };

const TABS: { key: SuggestionStatus; label: string }[] = [
  { key: "pending", label: "รอตรวจ" },
  { key: "accepted", label: "ใช้แล้ว" },
  { key: "partial", label: "ใช้บางส่วน" },
  { key: "rejected", label: "ปฏิเสธ" },
  { key: "superseded", label: "มีข้อเสนอใหม่กว่า" },
  { key: "expired", label: "หมดอายุ" },
];
const TYPES = Object.keys(TYPE_LABEL) as SuggestionTarget[];

/** ใครสั่งตรวจ — รอบอัตโนมัติแสดงเป็นคำอธิบายแทนรหัส */
const runBy = (by: string) =>
  ({
    "auto:news": "อัตโนมัติ: มีข่าวใหม่",
    "auto:stale": "อัตโนมัติ: ข้อมูลเก่า",
    "auto:monthly": "อัตโนมัติ: ทบทวนคู่มือรายเดือน",
    ตั้งเวลา: "ตรวจอัตโนมัติประจำวัน",
  })[by] ?? by.replace(/^manual:/, "");

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
            <span className={r.status === "failed" ? "text-urgent" : r.status === "running" ? "text-brand" : "text-good"}>
              {{ running: "กำลังตรวจ…", ok: "เสร็จ", failed: "มีปัญหา" }[r.status]}
            </span>{" "}
            · {fmtDate(r.startedAt)} · {runBy(r.triggeredBy)} —{" "}
            {r.status === "running"
              ? r.scope === "auto"
                ? "ตรวจหลายรายการ อาจใช้เวลาหลายนาที หน้านี้โหลดผลใหม่เองทุก 10 วินาที"
                : "ใช้เวลาประมาณ 1 นาที หน้านี้โหลดผลใหม่เองทุก 10 วินาที"
              : r.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SuggestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = TABS.find((t) => t.key === one(sp.status))?.key ?? "pending";
  const type = TYPES.find((t) => t === one(sp.type));
  const [suggestions, counts, typeCounts, recentRuns, autoRun, toolRows, guides, needsManual] = await Promise.all([
    listSuggestions(status, 50, type),
    countSuggestionsByStatus(),
    countPendingByType(),
    listCheckRuns(8),
    latestCheckRunFor("auto"),
    listToolRows(),
    loadAllGuides(),
    listNeedsManualCheck(MANUAL_MARK),
  ]);
  // รอบอัตโนมัติล่าสุดขึ้นก่อนเสมอ — ระหว่างรอบ ผลของแต่ละรายการถูกบันทึกเป็นแถวใหม่ จะดันแถวของรอบออกจากรายการล่าสุด
  const runs = [...(autoRun ? [autoRun] : []), ...recentRuns.filter((r) => r.id !== autoRun?.id && !r.scope.startsWith("auto:"))].slice(0, 8);
  const tools = new Map(toolRows.map((t) => [String(t.id), t]));
  const href = (st: SuggestionStatus, ty?: SuggestionTarget) => {
    const q = new URLSearchParams({ ...(st !== "pending" ? { status: st } : {}), ...(ty ? { type: ty } : {}) }).toString();
    return q ? `/admin/suggestions?${q}` : "/admin/suggestions";
  };

  return (
    <AdminPage
      title="ข้อเสนอแก้ไขจาก AI"
      description={
        <>
          AI เสนอสิ่งที่ควรแก้พร้อมหลักฐาน ข้อมูลบนเว็บจะเปลี่ยนเมื่อผู้ดูแลกดใช้เท่านั้น
          <br />
          ตรวจอัตโนมัติทุกเช้า: เครื่องมือที่มีข่าวใหม่ · สัปดาห์ละครั้ง: เครื่องมือที่ข้อมูลเก่ากว่า {STALE_AFTER_DAYS} วัน · เดือนละครั้ง: ทบทวนคู่มือทุกหมวด (เสนอแก้คู่มือ prompt
          ใหม่ และเครื่องมือที่ควรเพิ่ม) · สั่งเองได้จากหน้าแก้ไขเครื่องมือและหน้าแก้คู่มือ
        </>
      }
    >
      <FilterTabs
        label="สถานะข้อเสนอ"
        items={TABS.map((t) => ({ href: href(t.key, type), label: t.label, count: counts[t.key] ?? 0, active: t.key === status, alert: t.key === "pending" }))}
      />
      <div className="mt-3">
        <FilterTabs
          label="ประเภทข้อเสนอ"
          items={[
            { href: href(status), label: "ทุกประเภท", active: !type },
            ...TYPES.map((t) => ({
              href: href(status, t),
              label: TYPE_LABEL[t],
              count: status === "pending" ? (typeCounts[t] ?? 0) : undefined,
              active: t === type,
              alert: true,
            })),
          ]}
        />
      </div>

      <div className="mt-5 space-y-4">
        {suggestions.length === 0 ? (
          <EmptyState>{status === "pending" ? "ไม่มีข้อเสนอที่รอตรวจ" : "ยังไม่มีรายการ"}</EmptyState>
        ) : (
          suggestions.map((s) => <SuggestionCard key={s.id} s={s} tool={tools.get(s.targetKey)} guide={guides[s.targetKey]} />)
        )}
      </div>

      <NeedsManualPanel items={needsManual} tools={tools} />

      {/* ประวัติการตรวจอยู่ท้ายหน้า — งานหลักของหน้านี้คือรายการข้อเสนอ */}
      <RunPanel runs={runs} />
    </AdminPage>
  );
}
