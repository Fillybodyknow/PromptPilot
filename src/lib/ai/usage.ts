import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiUsage, AI_FEATURES } from "@/db/schema";
import { costUsd, usdToThb } from "./pricing";

export type AiFeature = (typeof AI_FEATURES)[number];

export const FEATURE_LABEL: Record<AiFeature, string> = {
  news: "ดึงและสรุปข่าว",
  tool_check: "ตรวจข้อมูลเครื่องมือ",
  guide_check: "ทบทวนคู่มือ",
};

/**
 * บันทึกการเรียก AI 1 ครั้ง — ห้ามทำให้งานหลักพัง (บันทึกไม่ได้แค่ log ไว้)
 * ครั้งที่ล้มเหลวก็บันทึก (token = 0) เพื่อให้หน้า dashboard เห็นปัญหา เช่น เครดิตหมด
 */
export async function recordAiUsage(u: {
  feature: AiFeature;
  provider: "anthropic" | "openai";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  ok: boolean;
  error?: string | null;
  ref?: string | null;
}): Promise<void> {
  const input = u.inputTokens ?? 0;
  const output = u.outputTokens ?? 0;
  try {
    await getDb()
      .insert(aiUsage)
      .values({
        at: new Date(),
        feature: u.feature,
        provider: u.provider,
        model: u.model.slice(0, 100),
        inputTokens: input,
        outputTokens: output,
        costUsd: costUsd(u.model, input, output),
        ok: u.ok,
        error: u.error ? u.error.slice(0, 500) : null,
        ref: u.ref ? u.ref.slice(0, 200) : null,
      });
  } catch (err) {
    console.error("record AI usage failed", err);
  }
}

// ---------------------------------------------------------------- เดือน (นับตามเวลาไทย)

const BKK_OFFSET_MS = 7 * 3_600_000;

/** ช่วงเวลา [start, end) ของเดือนตามเวลาไทย — offset 0 = เดือนนี้, -1 = เดือนก่อน */
export function bangkokMonth(offset = 0, now = new Date()): { start: Date; end: Date; days: number; label: string } {
  const local = new Date(now.getTime() + BKK_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + offset;
  const start = new Date(Date.UTC(y, m, 1) - BKK_OFFSET_MS);
  const end = new Date(Date.UTC(y, m + 1, 1) - BKK_OFFSET_MS);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const label = new Date(Date.UTC(y, m, 1)).toLocaleDateString("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, days, label };
}

async function costBetween(start: Date, end: Date): Promise<number> {
  const [r] = await getDb()
    .select({ usd: sql<string | null>`sum(${aiUsage.costUsd})` })
    .from(aiUsage)
    .where(and(gte(aiUsage.at, start), lt(aiUsage.at, end)));
  return Number(r?.usd ?? 0);
}

// ---------------------------------------------------------------- งบรายเดือน

export interface BudgetStatus {
  /** ไม่ได้ตั้งงบ = null */
  budgetThb: number | null;
  spentThb: number;
  /** spent / budget (0–∞) */
  ratio: number | null;
  level: "none" | "ok" | "warn" | "over";
}

/** ใกล้ถึงงบเมื่อใช้ไปเกินสัดส่วนนี้ */
export const BUDGET_WARN_RATIO = 0.8;

export function monthlyBudgetThb(): number | null {
  const n = Number(process.env.AI_MONTHLY_BUDGET_THB);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** งบเดือนนี้ — เกินงบ: หยุดการตรวจอัตโนมัติ (ดึงข่าวยังทำต่อ) */
export async function budgetStatus(): Promise<BudgetStatus> {
  const budgetThb = monthlyBudgetThb();
  const { start, end } = bangkokMonth(0);
  const spentThb = (await costBetween(start, end)) * usdToThb();
  if (budgetThb === null) return { budgetThb, spentThb, ratio: null, level: "none" };
  const ratio = spentThb / budgetThb;
  return { budgetThb, spentThb, ratio, level: ratio >= 1 ? "over" : ratio >= BUDGET_WARN_RATIO ? "warn" : "ok" };
}

// ---------------------------------------------------------------- สรุปสำหรับหน้า dashboard

export interface UsageGroup {
  key: string;
  calls: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** มีบางครั้งที่ไม่ทราบราคา (รุ่นที่ไม่อยู่ในตาราง) — ค่าใช้จ่ายจริงสูงกว่าที่แสดง */
  unpriced: number;
}

const groupCols = {
  calls: sql<number>`count(*)`,
  failed: sql<number>`sum(case when ${aiUsage.ok} then 0 else 1 end)`,
  inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
  outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
  costUsd: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`,
  unpriced: sql<number>`sum(case when ${aiUsage.ok} and ${aiUsage.costUsd} is null then 1 else 0 end)`,
};
const toGroup = (r: Record<string, unknown> & { key: string }): UsageGroup => ({
  key: r.key,
  calls: Number(r.calls),
  failed: Number(r.failed),
  inputTokens: Number(r.inputTokens),
  outputTokens: Number(r.outputTokens),
  costUsd: Number(r.costUsd),
  unpriced: Number(r.unpriced),
});

export async function usageSummary(start: Date, end: Date) {
  const db = getDb();
  const range = and(gte(aiUsage.at, start), lt(aiUsage.at, end));
  // วันตามเวลาไทย
  const day = sql<string>`date_format(date_add(${aiUsage.at}, interval 7 hour), '%Y-%m-%d')`;
  const [byFeature, byModel, byDay, recentErrors] = await Promise.all([
    db.select({ key: aiUsage.feature, ...groupCols }).from(aiUsage).where(range).groupBy(aiUsage.feature),
    db.select({ key: aiUsage.model, ...groupCols }).from(aiUsage).where(range).groupBy(aiUsage.model),
    db
      .select({ day, feature: aiUsage.feature, costUsd: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`, calls: sql<number>`count(*)` })
      .from(aiUsage)
      .where(range)
      .groupBy(day, aiUsage.feature),
    db.select().from(aiUsage).where(and(range, eq(aiUsage.ok, false))).orderBy(desc(aiUsage.id)).limit(10),
  ]);
  return {
    byFeature: byFeature.map(toGroup),
    byModel: byModel.map(toGroup).sort((a, b) => b.costUsd - a.costUsd),
    byDay: byDay.map((r) => ({ day: r.day, feature: r.feature, costUsd: Number(r.costUsd), calls: Number(r.calls) })),
    recentErrors,
  };
}

export { costBetween as usageCostBetween };
