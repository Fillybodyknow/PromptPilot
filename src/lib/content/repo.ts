import { and, asc, count, desc, eq, inArray, lt } from "drizzle-orm";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDb, getPool } from "@/db/client";
import { checkRuns, contentSuggestions, SUGGESTION_STATUSES, watchPages, type SuggestedChange } from "@/db/schema";

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
export type SuggestionRow = typeof contentSuggestions.$inferSelect;
export type WatchPageRow = typeof watchPages.$inferSelect;
export type CheckRunRow = typeof checkRuns.$inferSelect;

/** ข้อเสนอที่ค้างเกินนี้ปิดเอง — ข้อมูลที่ AI อ่านมาอาจไม่ทันสมัยแล้ว */
const SUGGESTION_TTL_DAYS = 30;
/** รอบตรวจที่ค้างสถานะ "กำลังตรวจ" นานเกินนี้ถือว่าหยุดกลางคัน */
const STALE_RUN_MS = 15 * 60_000;

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

/** ยังไม่เคยตั้งหน้าที่ใช้ตรวจ → เริ่มจากลิงก์หน้าทางการของเครื่องมือ */
export async function ensureWatchPages(toolId: number, defaultUrl: string): Promise<WatchPageRow[]> {
  const pages = await listWatchPages(toolId);
  if (pages.length > 0) return pages;
  await getDb().insert(watchPages).values({ toolId, url: defaultUrl.slice(0, 500) });
  return listWatchPages(toolId);
}

export async function recordWatchResult(id: number, result: { hash?: string; status: string }): Promise<void> {
  await getDb()
    .update(watchPages)
    .set({ ...(result.hash ? { lastHash: result.hash } : {}), lastStatus: result.status.slice(0, 200), lastCheckedAt: new Date() })
    .where(eq(watchPages.id, id));
}

// ---------------------------------------------------------------- ข้อเสนอแก้ไข

/** สร้างข้อเสนอใหม่ และปิดข้อเสนอเดิมที่ยังค้างของเป้าหมายเดียวกัน (ข้อมูลใหม่กว่าแทนที่) */
export async function createSuggestion(s: {
  targetType: "tool" | "guide";
  targetKey: string;
  changes: SuggestedChange[];
  summary: string | null;
  confidence: "low" | "medium" | "high";
  trigger: "manual" | "news" | "stale" | "monthly";
  triggerRef: string | null;
}): Promise<number> {
  return getDb().transaction(async (tx) => {
    await tx
      .update(contentSuggestions)
      .set({ status: "superseded" })
      .where(and(eq(contentSuggestions.targetType, s.targetType), eq(contentSuggestions.targetKey, s.targetKey), eq(contentSuggestions.status, "pending")));
    const [res] = await tx.insert(contentSuggestions).values({ ...s, triggerRef: s.triggerRef?.slice(0, 320) ?? null, createdAt: new Date() });
    return res.insertId;
  });
}

async function expireOldSuggestions(): Promise<void> {
  await getDb()
    .update(contentSuggestions)
    .set({ status: "expired" })
    .where(and(eq(contentSuggestions.status, "pending"), lt(contentSuggestions.createdAt, new Date(Date.now() - SUGGESTION_TTL_DAYS * 86_400_000))));
}

export async function listSuggestions(status: SuggestionStatus, limit = 50): Promise<SuggestionRow[]> {
  if (status === "pending") await expireOldSuggestions();
  return getDb()
    .select()
    .from(contentSuggestions)
    .where(eq(contentSuggestions.status, status))
    .orderBy(status === "pending" ? asc(contentSuggestions.createdAt) : desc(contentSuggestions.decidedAt), desc(contentSuggestions.id))
    .limit(limit);
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
    .set({ status, decidedBy: by.slice(0, 320), decidedAt: new Date(), decisionNote: note })
    .where(and(eq(contentSuggestions.id, id), eq(contentSuggestions.status, "pending")));
  return res.affectedRows === 1;
}

/** ย้อนการตัดสิน เมื่อบันทึกข้อมูลจริงไม่สำเร็จหลังจองสถานะแล้ว */
export async function reopenSuggestion(id: number): Promise<void> {
  await getDb().update(contentSuggestions).set({ status: "pending", decidedBy: null, decidedAt: null, decisionNote: null }).where(eq(contentSuggestions.id, id));
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
  const [res] = await getDb().insert(checkRuns).values({ triggeredBy: triggeredBy.slice(0, 320), scope, startedAt: new Date(), status: "running" });
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
  return rows.map((r) =>
    r.status === "running" && r.startedAt.getTime() < Date.now() - STALE_RUN_MS
      ? { ...r, status: "failed" as const, message: "รอบนี้หยุดทำงานกลางคันโดยไม่มีผลลัพธ์" }
      : r,
  );
}

export async function latestCheckRunFor(scope: string): Promise<CheckRunRow | null> {
  const [r] = await getDb().select().from(checkRuns).where(eq(checkRuns.scope, scope)).orderBy(desc(checkRuns.id)).limit(1);
  if (!r) return null;
  return r.status === "running" && r.startedAt.getTime() < Date.now() - STALE_RUN_MS ? { ...r, status: "failed", message: "รอบนี้หยุดทำงานกลางคันโดยไม่มีผลลัพธ์" } : r;
}
