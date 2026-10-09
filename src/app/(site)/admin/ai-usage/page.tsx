import type { Metadata } from "next";
import { AdminPage, FilterTabs, SectionTitle } from "@/components/admin/AdminPage";
import { UsageChart, type UsageDay } from "@/components/admin/UsageChart";
import { card } from "@/components/site/ui";
import { AI_FEATURES } from "@/db/schema";
import { requireAdminPage } from "@/lib/adminSession";
import { priceOf, usdToThb } from "@/lib/ai/pricing";
import { bangkokMonth, budgetStatus, BUDGET_WARN_RATIO, FEATURE_LABEL, usageCostBetween, usageSummary, type UsageGroup } from "@/lib/ai/usage";
import { decisionsByType } from "@/lib/content/repo";
import { one, type SearchParams } from "@/lib/params";
import { TYPE_LABEL } from "../suggestions/cards";

export const metadata: Metadata = { title: "การใช้ AI" };

const thb = (usd: number, rate: number) => `${(usd * rate).toLocaleString("th-TH", { maximumFractionDigits: usd * rate >= 100 ? 0 : 2 })} บาท`;
const usdText = (usd: number) => `$${usd.toFixed(usd >= 1 ? 2 : 3)}`;
const num = (n: number) => n.toLocaleString("th-TH");
const fmtDate = (d: Date) => d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });

/** จำนวนวัน (มีเศษ) ตั้งแต่ต้นเดือนถึงตอนนี้ อย่างน้อย 1 */
function daysSince(start: Date): number {
  return Math.max(1, (Date.now() - start.getTime()) / 86_400_000);
}

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "warn" | "urgent" }) {
  return (
    <div className={`${card} flex flex-col gap-1 p-5 ${tone === "urgent" ? "border-urgent" : tone === "warn" ? "border-warn" : ""}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {note && <span className="text-[13px] leading-relaxed text-muted">{note}</span>}
    </div>
  );
}

function UsageTable({ caption, rows, rate, label }: { caption: string; rows: UsageGroup[]; rate: number; label: (key: string) => string }) {
  if (rows.length === 0) return null;
  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-chip text-left text-muted">
            <th className="px-4 py-3 font-semibold">{caption}</th>
            <th className="px-4 py-3 text-right font-semibold">เรียก</th>
            <th className="px-4 py-3 text-right font-semibold">ล้มเหลว</th>
            <th className="px-4 py-3 text-right font-semibold">token เข้า / ออก</th>
            <th className="px-4 py-3 text-right font-semibold">ค่าใช้จ่าย</th>
            <th className="px-4 py-3 text-right font-semibold">เฉลี่ยต่อครั้ง</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const okCalls = r.calls - r.failed;
            return (
              <tr key={r.key} className="border-t border-line">
                <td className="px-4 py-2.5 font-medium">
                  {label(r.key)}
                  {r.unpriced > 0 && <span className="ml-2 rounded-full bg-warn-bg px-2 py-0.5 text-xs text-warn">ไม่ทราบราคา {r.unpriced} ครั้ง</span>}
                </td>
                <td className="px-4 py-2.5 text-right">{num(r.calls)}</td>
                <td className={`px-4 py-2.5 text-right ${r.failed ? "font-semibold text-urgent" : "text-muted"}`}>{num(r.failed)}</td>
                <td className="px-4 py-2.5 text-right text-muted">
                  {num(r.inputTokens)} / {num(r.outputTokens)}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{thb(r.costUsd, rate)}</td>
                <td className="px-4 py-2.5 text-right text-muted">{okCalls ? thb(r.costUsd / okCalls, rate) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AiUsagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const prev = one((await searchParams).month) === "prev";
  const month = bangkokMonth(prev ? -1 : 0);
  const before = bangkokMonth(prev ? -2 : -1);
  const rate = usdToThb();
  const [summary, beforeUsd, budget, decisions] = await Promise.all([usageSummary(month.start, month.end), usageCostBetween(before.start, before.end), budgetStatus(), decisionsByType(90)]);

  const totalUsd = summary.byFeature.reduce((a, r) => a + r.costUsd, 0);
  const calls = summary.byFeature.reduce((a, r) => a + r.calls, 0);
  const failed = summary.byFeature.reduce((a, r) => a + r.failed, 0);
  // ประมาณการทั้งเดือน = ใช้ไปแล้ว ÷ วันที่ผ่านไป × จำนวนวันของเดือน (เดือนที่จบแล้วใช้ยอดจริง)
  // เริ่มนับจากวันแรกที่มีข้อมูลในเดือน (เดือนแรกที่ติดตั้งจะไม่ถูกหารด้วยวันที่ยังไม่ได้เก็บ)
  const firstDay = summary.byDay.map((d) => d.day).sort()[0];
  const countFrom = firstDay ? new Date(Math.max(month.start.getTime(), new Date(`${firstDay}T00:00:00+07:00`).getTime())) : month.start;
  const elapsedDays = prev ? month.days : daysSince(countFrom);
  const monthDaysLeft = prev ? 0 : Math.max(0, month.days - daysSince(month.start));
  const projectedUsd = prev ? totalUsd : totalUsd + (totalUsd / elapsedDays) * monthDaysLeft;

  // กราฟรายวัน: ทุกวันของเดือน (ถึงวันนี้) แม้วันที่ไม่ได้ใช้
  const dayKeys: string[] = [];
  const lastDay = prev ? month.days : Math.min(month.days, Math.ceil(daysSince(month.start)));
  for (let i = 0; i < lastDay; i++) dayKeys.push(new Date(month.start.getTime() + 7 * 3_600_000 + i * 86_400_000).toISOString().slice(0, 10));
  const days: UsageDay[] = dayKeys.map((day) => ({
    day,
    values: AI_FEATURES.map((f) => summary.byDay.filter((d) => d.day === day && d.feature === f).reduce((a, d) => a + d.costUsd, 0) * rate),
  }));

  const budgetTone = budget.level === "over" ? "urgent" : budget.level === "warn" ? "warn" : undefined;
  const budgetPct = budget.ratio !== null ? Math.min(100, Math.round(budget.ratio * 100)) : 0;

  return (
    <AdminPage
      title="การใช้ AI"
      description={`ค่าใช้จ่ายประมาณจาก token ที่ระบบนับเอง × ราคาทางการต่อรุ่น (อัตรา ${rate} บาท/ดอลลาร์) — ใกล้เคียงบิลจริง ยอดจริงดูได้ในหน้า billing ของ Anthropic/OpenAI`}
    >
      <FilterTabs
        label="เดือน"
        items={[
          { href: "/admin/ai-usage", label: "เดือนนี้", active: !prev },
          { href: "/admin/ai-usage?month=prev", label: "เดือนที่แล้ว", active: prev },
        ]}
      />

      {/* ---------- งบ ---------- */}
      {!prev && (
        <section aria-label="งบรายเดือน" className={`${card} mt-5 p-5 ${budgetTone === "urgent" ? "border-urgent" : budgetTone === "warn" ? "border-warn" : ""}`}>
          {budget.budgetThb === null ? (
            <p className="text-sm text-muted">
              ยังไม่ได้ตั้งงบรายเดือน — ตั้ง <code className="rounded bg-chip px-1">AI_MONTHLY_BUDGET_THB</code> ใน .env.local บน server (เช่น 300) ระบบจะเตือนเมื่อใช้ไปเกิน {Math.round(BUDGET_WARN_RATIO * 100)}% และหยุดการตรวจข้อมูลอัตโนมัติเมื่อเกินงบ
              (ดึงข่าวยังทำต่อ)
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">งบ AI เดือนนี้</h2>
                <p className="text-sm">
                  <span className="text-lg font-bold">{Math.round(budget.spentThb).toLocaleString("th-TH")}</span>
                  <span className="text-muted"> / {budget.budgetThb.toLocaleString("th-TH")} บาท ({budgetPct}%)</span>
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuenow={budgetPct} aria-valuemin={0} aria-valuemax={100} aria-label="ใช้งบไปแล้ว">
                <div className={`h-full rounded-full ${budgetTone === "urgent" ? "bg-urgent" : budgetTone === "warn" ? "bg-warn" : "bg-good"}`} style={{ width: `${budgetPct}%` }} />
              </div>
              <p className={`mt-2 text-sm ${budgetTone === "urgent" ? "font-semibold text-urgent" : budgetTone === "warn" ? "font-semibold text-warn" : "text-muted"}`}>
                {budget.level === "over"
                  ? "⛔ เกินงบแล้ว — หยุดการตรวจข้อมูลอัตโนมัติจนถึงเดือนหน้าหรือจนกว่าจะเพิ่มงบ (ดึงข่าวและการกดตรวจเองยังทำได้)"
                  : budget.level === "warn"
                    ? `⚠ ใช้ไปเกิน ${Math.round(BUDGET_WARN_RATIO * 100)}% แล้ว — ถ้าเกินงบ การตรวจข้อมูลอัตโนมัติจะหยุด`
                    : `ถ้าใช้ในอัตรานี้ทั้งเดือนจะอยู่ที่ประมาณ ${thb(projectedUsd, rate)}`}
              </p>
            </>
          )}
        </section>
      )}

      {/* ---------- ตัวเลขหลัก ---------- */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={`ค่าใช้จ่าย ${month.label}`} value={thb(totalUsd, rate)} note={usdText(totalUsd)} />
        <Tile label={prev ? "ทั้งเดือน" : "ประมาณการทั้งเดือน"} value={thb(projectedUsd, rate)} note={prev ? "ยอดจริงของเดือน" : `จากค่าเฉลี่ยต่อวัน ${Math.ceil(elapsedDays)} วันที่มีข้อมูล`} />
        <Tile
          label={`เทียบ${before.label}`}
          value={thb(beforeUsd, rate)}
          note={beforeUsd > 0 ? `${projectedUsd >= beforeUsd ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(Math.round(((projectedUsd - beforeUsd) / beforeUsd) * 100))}% (เทียบ${prev ? "ยอดจริง" : "ประมาณการ"})` : "ยังไม่มีข้อมูลเดือนก่อน"}
        />
        <Tile label="เรียก AI" value={`${num(calls)} ครั้ง`} note={failed ? `ล้มเหลว ${num(failed)} ครั้ง — ดูสาเหตุด้านล่าง` : "ไม่มีครั้งที่ล้มเหลว"} tone={failed ? "warn" : undefined} />
      </div>

      {/* ---------- รายวัน ---------- */}
      <section className="mt-8" aria-labelledby="daily">
        <SectionTitle id="daily" title="ค่าใช้จ่ายรายวัน (บาท)" note="ชี้ที่แท่งเพื่อดูรายละเอียดของวันนั้น" />
        <div className={`${card} p-5`}>
          {calls === 0 ? <p className="py-10 text-center text-muted">ยังไม่มีการเรียก AI ในเดือนนี้</p> : <UsageChart days={days} series={AI_FEATURES.map((f) => FEATURE_LABEL[f])} />}
        </div>
      </section>

      {/* ---------- ตาราง ---------- */}
      <section className="mt-8 space-y-4" aria-labelledby="tables">
        <SectionTitle id="tables" title="แยกตามงานและตามรุ่น" />
        <UsageTable caption="งาน" rows={summary.byFeature} rate={rate} label={(k) => FEATURE_LABEL[k as keyof typeof FEATURE_LABEL] ?? k} />
        <UsageTable
          caption="รุ่น"
          rows={summary.byModel}
          rate={rate}
          label={(k) => {
            const p = priceOf(k);
            return p ? `${k} ($${p.input} / $${p.output} ต่อ 1M token)` : k;
          }}
        />
      </section>

      {/* ---------- ความผิดพลาด ---------- */}
      {summary.recentErrors.length > 0 && (
        <section className="mt-8" aria-labelledby="errors">
          <SectionTitle id="errors" title="เรียก AI ไม่สำเร็จล่าสุด" note="เช่น key ผิด เครดิตหมด ตอบไม่ทัน — ระบบลองเจ้าสำรองให้แล้ว แต่ควรแก้ต้นเหตุ" />
          <ul className={`${card} divide-y divide-line text-sm`}>
            {summary.recentErrors.map((e) => (
              <li key={e.id} className="px-5 py-3">
                <p className="flex flex-wrap gap-x-2 text-muted">
                  <span>{fmtDate(e.at)}</span>·<span>{FEATURE_LABEL[e.feature]}</span>·<span className="font-medium text-ink">{e.model}</span>
                  {e.ref && <span>· {e.ref}</span>}
                </p>
                <p className="mt-0.5 break-words text-urgent">{e.error}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- ความคุ้มค่า ---------- */}
      <section className="mt-8" aria-labelledby="value">
        <SectionTitle id="value" title="ข้อเสนอแก้ไขจาก AI ถูกนำไปใช้แค่ไหน" note="90 วันล่าสุด — ประเภทที่ถูกปฏิเสธบ่อยอาจไม่คุ้มค่าใช้จ่าย" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {decisions.map((d) => {
            const decided = d.used + d.rejected + d.expired;
            return (
              <Tile
                key={d.type}
                label={TYPE_LABEL[d.type]}
                value={decided ? `${Math.round((d.used / decided) * 100)}% ถูกใช้` : "—"}
                note={decided ? `ใช้ ${d.used} · ปฏิเสธ ${d.rejected} · หมดอายุ ${d.expired}` : "ยังไม่มีข้อเสนอที่ตัดสินแล้ว"}
              />
            );
          })}
        </div>
      </section>
    </AdminPage>
  );
}
