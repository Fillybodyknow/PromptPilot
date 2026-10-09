import { and, asc, count, desc, eq, gt, inArray, like, lt } from "drizzle-orm";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb, getPool } from "@/db/client";
import { checkRuns, contentSuggestions, SUGGESTION_STATUSES, SUGGESTION_TARGETS, watchPages, type SuggestedChange } from "@/db/schema";

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
export type SuggestionTarget = (typeof SUGGESTION_TARGETS)[number];
export type SuggestionRow = typeof contentSuggestions.$inferSelect;
export type WatchPageRow = typeof watchPages.$inferSelect;
export type CheckRunRow = typeof checkRuns.$inferSelect;

/** ข้อเสนอที่ค้างเกินนี้ปิดเอง — ข้อมูลที่ AI อ่านมาอาจไม่ทันสมัยแล้ว */
const SUGGESTION_TTL_DAYS = 30;
/** รอบตรวจที่ค้างสถานะ "กำลังตรวจ" นานเกินนี้ถือว่าหยุดกลางคัน — รอบอัตโนมัติตรวจหลายตัวจึงให้เวลานานกว่า (เท่ากับ time limit ของ Task Scheduler) */
const stuckAfterMs = (scope: string) => (scope.startsWith("auto") ? 60 : 15) * 60_000;
const STUCK_MESSAGE = "รอบนี้หยุดทำงานกลางคันโดยไม่มีผลลัพธ์";
const withStuck = (r: CheckRunRow): CheckRunRow =>
  r.status === "running" && r.startedAt.getTime() < Date.now() - stuckAfterMs(r.scope) ? { ...r, status: "failed", message: STUCK_MESSAGE } : r;

// ---------------------------------------------------------------- หน้าที่ใช้ตรวจ

export async function listWatchPages(toolId: number): Promise<WatchPageRow[]> {
  return getDb().select().from(watchPages).where(eq(watchPages.toolId, toolId)).orderBy(asc(watchPages.id));
}

/** แทนรายการหน้าที่ใช้ตรวจทั้งหมดของเครื่องมือ (เก็บค่า hash เดิมของหน้าที่ยังอยู่) */
export async function setWatchPages(toolId: number, urls: string[]): Promise<void> {
  const db = getDb();
  const existing = await listWatchPages(toolId);
  // unique index ของ MySQL ไม่สนตัวพิมพ์เล็กใหญ่ — เทียบแบบเดียวกัน
  const key = (u: string) => u.toLowerCase();
  const keep = new Set(urls.map(key));
  const remove = existing.filter((p) => !keep.has(key(p.url))).map((p) => p.id);
  if (remove.length) await db.delete(watchPages).where(inArray(watchPages.id, remove));
  const have = new Set(existing.filter((p) => keep.has(key(p.url))).map((p) => key(p.url)));
  const add = urls.filter((u) => !have.has(key(u)));
  if (add.length) await db.insert(watchPages).values(add.map((url) => ({ toolId, url })));
}

/** ยังไม่เคยตั้งหน้าที่ใช้ตรวจ → เริ่มจากหน้าตั้งต้นของเครื่องมือ (ดู defaultWatchUrls) */
export async function ensureWatchPages(toolId: number, defaultUrls: string[]): Promise<WatchPageRow[]> {
  const pages = await listWatchPages(toolId);
  if (pages.length > 0) return pages;
  await getDb()
    .insert(watchPages)
    .values(defaultUrls.map((url) => ({ toolId, url: url.slice(0, 500) })));
  return listWatchPages(toolId);
}

/**
 * เครื่องมือที่ผลตรวจล่าสุดบอกว่า AI ตรวจแทนไม่ได้ (เปิดหน้าทางการไม่ได้ หรือหน้าไม่มีข้อมูลของเครื่องมือนี้)
 * marker = คำที่ใส่ในข้อความผลตรวจกรณีนี้ (MANUAL_MARK ใน toolCheck — รับเป็นพารามิเตอร์เพื่อไม่ให้ repo พึ่ง toolCheck)
 */
export async function listNeedsManualCheck(marker: string): Promise<{ toolId: number; message: string; at: Date }[]> {
  const rows = await getDb()
    .select({
      scope: checkRuns.scope,
      message: checkRuns.message,
      startedAt: checkRuns.startedAt,
      status: checkRuns.status,
    })
    .from(checkRuns)
    .where(like(checkRuns.scope, "tool:%"))
    .orderBy(desc(checkRuns.id))
    .limit(2000);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (r.status !== "running" && !latest.has(r.scope)) latest.set(r.scope, r);
  return [...latest.values()]
    .filter((r) => r.status === "ok" && r.message?.includes(marker))
    .map((r) => ({
      toolId: Number(r.scope.slice(5)),
      message: r.message ?? "",
      at: r.startedAt,
    }));
}

/** checked: false = บันทึกสถานะอย่างเดียว ยังไม่นับเป็นเวลาที่ AI ตรวจล่าสุด (รอบอัตโนมัติใช้เวลานี้เลือกเครื่องมือ) */
export async function recordWatchResult(id: number, result: { hash?: string; status: string; checked?: boolean }): Promise<void> {
  await getDb()
    .update(watchPages)
    .set({
      ...(result.hash ? { lastHash: result.hash } : {}),
      lastStatus: result.status.slice(0, 200),
      ...(result.checked === false ? {} : { lastCheckedAt: new Date() }),
    })
    .where(eq(watchPages.id, id));
}

export async function markWatchChecked(ids: number[]): Promise<void> {
  if (ids.length) await getDb().update(watchPages).set({ lastCheckedAt: new Date() }).where(inArray(watchPages.id, ids));
}

// ---------------------------------------------------------------- ข้อเสนอแก้ไข

/**
 * สร้างข้อเสนอใหม่ — ข้อเสนอแก้ข้อมูล (tool/guide) ปิดข้อเสนอเดิมที่ยังค้างของเป้าหมายเดียวกัน (ข้อมูลใหม่กว่าแทนที่)
 * ส่วน prompt/เครื่องมือใหม่ แต่ละรายการเป็นข้อเสนอแยก ตัดสินแยกกัน จึงไม่ทับกัน
 */
export async function createSuggestion(s: {
  targetType: SuggestionTarget;
  targetKey: string;
  changes: SuggestedChange[];
  summary: string | null;
  confidence: "low" | "medium" | "high";
  trigger: "manual" | "news" | "stale" | "monthly";
  triggerRef: string | null;
}): Promise<number> {
  return getDb().transaction(async (tx) => {
    if (s.targetType === "tool" || s.targetType === "guide")
      await tx
        .update(contentSuggestions)
        .set({ status: "superseded" })
        .where(and(eq(contentSuggestions.targetType, s.targetType), eq(contentSuggestions.targetKey, s.targetKey), eq(contentSuggestions.status, "pending")));
    const [res] = await tx.insert(contentSuggestions).values({
      ...s,
      triggerRef: s.triggerRef?.slice(0, 320) ?? null,
      createdAt: new Date(),
    });
    return res.insertId;
  });
}

async function expireOldSuggestions(): Promise<void> {
  await getDb()
    .update(contentSuggestions)
    .set({ status: "expired" })
    .where(and(eq(contentSuggestions.status, "pending"), lt(contentSuggestions.createdAt, new Date(Date.now() - SUGGESTION_TTL_DAYS * 86_400_000))));
}

export async function listSuggestions(status: SuggestionStatus, limit = 50, type?: SuggestionTarget): Promise<SuggestionRow[]> {
  if (status === "pending") await expireOldSuggestions();
  return getDb()
    .select()
    .from(contentSuggestions)
    .where(and(eq(contentSuggestions.status, status), type ? eq(contentSuggestions.targetType, type) : undefined))
    .orderBy(status === "pending" ? asc(contentSuggestions.createdAt) : desc(contentSuggestions.decidedAt), desc(contentSuggestions.id))
    .limit(limit);
}

/** จำนวนข้อเสนอที่รอตรวจแยกตามประเภท (ใช้กับแท็บกรอง) */
export async function countPendingByType(): Promise<Partial<Record<SuggestionTarget, number>>> {
  await expireOldSuggestions();
  const rows = await getDb()
    .select({ type: contentSuggestions.targetType, n: count() })
    .from(contentSuggestions)
    .where(eq(contentSuggestions.status, "pending"))
    .groupBy(contentSuggestions.targetType);
  return Object.fromEntries(rows.map((r) => [r.type, r.n]));
}

/** ข้อเสนอที่รอตรวจของหมวดหนึ่ง (แก้คู่มือ, prompt ใหม่, เครื่องมือใหม่) — แสดงในหน้าแก้คู่มือ */
export async function countPendingForCategory(categoryKey: string): Promise<number> {
  await expireOldSuggestions();
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(contentSuggestions)
    .where(
      and(
        eq(contentSuggestions.status, "pending"),
        eq(contentSuggestions.targetKey, categoryKey),
        inArray(contentSuggestions.targetType, ["guide", "prompt", "new_tool"]),
      ),
    );
  return n;
}

/** งานของ prompt ที่เคยเสนอให้หมวดนี้ (ทุกสถานะ) ในช่วงที่กำหนด — ไม่เสนอซ้ำทั้งที่ยังรอตรวจและที่ถูกปฏิเสธ */
export async function recentPromptTasks(categoryKey: string, days: number): Promise<string[]> {
  const rows = await getDb()
    .select({ changes: contentSuggestions.changes })
    .from(contentSuggestions)
    .where(
      and(
        eq(contentSuggestions.targetType, "prompt"),
        eq(contentSuggestions.targetKey, categoryKey),
        gt(contentSuggestions.createdAt, new Date(Date.now() - days * 86_400_000)),
      ),
    );
  return rows.flatMap((r) => r.changes.map((c) => String((c.after as { task?: string } | null)?.task ?? ""))).filter(Boolean);
}

/** ชื่อเครื่องมือใหม่ที่เคยเสนอไปแล้ว (ทุกสถานะ) ในช่วงที่กำหนด — ไม่เสนอซ้ำตัวที่คนเคยปฏิเสธหรือยังค้างอยู่ */
export async function recentNewToolNames(days: number): Promise<string[]> {
  const rows = await getDb()
    .select({ changes: contentSuggestions.changes })
    .from(contentSuggestions)
    .where(and(eq(contentSuggestions.targetType, "new_tool"), gt(contentSuggestions.createdAt, new Date(Date.now() - days * 86_400_000))));
  return rows.flatMap((r) => r.changes.map((c) => String((c.after as { name?: string } | null)?.name ?? ""))).filter(Boolean);
}

export async function getSuggestion(id: number): Promise<SuggestionRow | null> {
  const [row] = await getDb().select().from(contentSuggestions).where(eq(contentSuggestions.id, id));
  return row ?? null;
}

export async function countSuggestionsByStatus(): Promise<Partial<Record<SuggestionStatus, number>>> {
  await expireOldSuggestions();
  const rows = await getDb().select({ status: contentSuggestions.status, n: count() }).from(contentSuggestions).groupBy(contentSuggestions.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function pendingSuggestionFor(targetType: "tool" | "guide", targetKey: string): Promise<SuggestionRow | null> {
  const [row] = await getDb()
    .select()
    .from(contentSuggestions)
    .where(and(eq(contentSuggestions.targetType, targetType), eq(contentSuggestions.targetKey, targetKey), eq(contentSuggestions.status, "pending")))
    .orderBy(desc(contentSuggestions.id))
    .limit(1);
  return row ?? null;
}

/** ตัดสินข้อเสนอ — เฉพาะที่ยังค้างอยู่ (กันกดซ้ำ/สองคนกดพร้อมกัน) คืน false ถ้าถูกตัดสินไปแล้ว */
export async function decideSuggestion(id: number, status: "accepted" | "partial" | "rejected", by: string, note: string | null): Promise<boolean> {
  const [res] = await getDb()
    .update(contentSuggestions)
    .set({
      status,
      decidedBy: by.slice(0, 320),
      decidedAt: new Date(),
      decisionNote: note,
    })
    .where(and(eq(contentSuggestions.id, id), eq(contentSuggestions.status, "pending")));
  return res.affectedRows === 1;
}

/** ย้อนการตัดสิน เมื่อบันทึกข้อมูลจริงไม่สำเร็จหลังจองสถานะแล้ว */
export async function reopenSuggestion(id: number): Promise<void> {
  await getDb()
    .update(contentSuggestions)
    .set({
      status: "pending",
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
    })
    .where(eq(contentSuggestions.id, id));
}

// ---------------------------------------------------------------- รอบตรวจ (กันรันซ้อนด้วย MySQL lock แบบเดียวกับการดึงข่าว)

const LOCK_NAME = "promptpilot_content_check";
let lockConn: PoolConnection | null = null;

export async function beginCheckRun(triggeredBy: string, scope: string): Promise<number | null> {
  const conn = await getPool().getConnection();
  const [rows] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK(?, 0) AS got", [LOCK_NAME]);
  if (rows[0]?.got !== 1) {
    conn.release();
    return null;
  }
  lockConn = conn;
  const [res] = await getDb()
    .insert(checkRuns)
    .values({
      triggeredBy: triggeredBy.slice(0, 320),
      scope,
      startedAt: new Date(),
      status: "running",
    });
  return res.insertId;
}

export async function finishCheckRun(id: number, status: "ok" | "failed", message: string): Promise<void> {
  await getDb().update(checkRuns).set({ status, message, finishedAt: new Date() }).where(eq(checkRuns.id, id));
  if (lockConn) {
    await lockConn.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    lockConn.release();
    lockConn = null;
  }
}

export async function listCheckRuns(limit = 5): Promise<CheckRunRow[]> {
  const rows = await getDb().select().from(checkRuns).orderBy(desc(checkRuns.id)).limit(limit);
  return rows.map(withStuck);
}

export async function latestCheckRunFor(scope: string): Promise<CheckRunRow | null> {
  const [r] = await getDb().select().from(checkRuns).where(eq(checkRuns.scope, scope)).orderBy(desc(checkRuns.id)).limit(1);
  return r ? withStuck(r) : null;
}

/**
 * บันทึกผลที่เสร็จแล้วระหว่างรอบอัตโนมัติ (รอบใหญ่ถือ lock อยู่แล้ว): ผลของเครื่องมือแต่ละตัว (scope tool:<id>)
 * ให้หน้าแก้ไขเครื่องมือเห็นผลล่าสุดของตัวเอง และสรุปรอบข้อมูลเก่า (auto:stale) ที่ใช้นับรอบสัปดาห์
 */
export async function recordRun(scope: string, triggeredBy: string, startedAt: Date, status: "ok" | "failed", message: string): Promise<void> {
  await getDb()
    .insert(checkRuns)
    .values({
      triggeredBy: triggeredBy.slice(0, 320),
      scope,
      startedAt,
      finishedAt: new Date(),
      status,
      message: message.slice(0, 2000),
    });
}
