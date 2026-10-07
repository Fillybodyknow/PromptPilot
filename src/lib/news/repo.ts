import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDb, getPool } from "@/db/client";
import { fetchRuns, newsCategories, newsItems } from "@/db/schema";
import type { NewsItem, NewsStatus } from "./schema";

type ItemRow = typeof newsItems.$inferSelect;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toItem(r: ItemRow, categories: string[]): NewsItem {
  return {
    id: r.id,
    url: r.url,
    source: r.source,
    title: r.title,
    snippet: r.snippet,
    publishedAt: r.publishedAt.toISOString(),
    fetchedAt: r.fetchedAt.toISOString(),
    titleTh: r.titleTh,
    summaryTh: r.summaryTh,
    categories,
    importance: r.importance,
    aiReason: r.aiReason,
    status: r.status,
    reviewedBy: r.reviewedBy,
    reviewedAt: iso(r.reviewedAt),
  };
}

const affected = (res: [ResultSetHeader, unknown]) => res[0].affectedRows;

export type NewItem = Omit<NewsItem, "reviewedBy" | "reviewedAt">;

/** คืน id ที่มีอยู่แล้วใน DB (ใช้ตัดข่าวซ้ำก่อนส่งให้ AI) */
export async function findExistingIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await getDb().select({ id: newsItems.id }).from(newsItems).where(inArray(newsItems.id, ids));
  return new Set(rows.map((r) => r.id));
}

export async function insertItems(items: NewItem[]): Promise<number> {
  if (items.length === 0) return 0;
  return getDb().transaction(async (tx) => {
    const res = await tx
      .insert(newsItems)
      .ignore()
      .values(
        items.map((it) => ({
          id: it.id,
          url: it.url,
          source: it.source,
          title: it.title,
          snippet: it.snippet,
          publishedAt: new Date(it.publishedAt),
          fetchedAt: new Date(it.fetchedAt),
          titleTh: it.titleTh,
          summaryTh: it.summaryTh,
          importance: it.importance,
          aiReason: it.aiReason,
          status: it.status,
        })),
      );
    const cats = items.flatMap((it) => it.categories.map((categoryKey) => ({ newsId: it.id, categoryKey })));
    if (cats.length > 0) await tx.insert(newsCategories).ignore().values(cats);
    return affected(res);
  });
}

async function categoriesFor(ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  const rows = await getDb().select().from(newsCategories).where(inArray(newsCategories.newsId, ids));
  for (const r of rows) map.set(r.newsId, [...(map.get(r.newsId) ?? []), r.categoryKey]);
  return map;
}

export async function listByStatus(status: NewsStatus, limit = 100): Promise<NewsItem[]> {
  const rows = await getDb()
    .select()
    .from(newsItems)
    .where(eq(newsItems.status, status))
    .orderBy(desc(sql`coalesce(${newsItems.importance}, 0)`), desc(newsItems.publishedAt))
    .limit(limit);
  const cats = await categoriesFor(rows.map((r) => r.id));
  return rows.map((r) => toItem(r, cats.get(r.id) ?? []));
}

/** คืน false ถ้าไม่พบข่าว หรือจะอนุมัติข่าวที่ยังไม่มีหัวข้อ/คำสรุปภาษาไทย */
export async function setStatus(id: string, status: NewsStatus, reviewedBy: string): Promise<boolean> {
  const where =
    status === "approved"
      ? and(eq(newsItems.id, id), isNotNull(newsItems.titleTh), isNotNull(newsItems.summaryTh))
      : eq(newsItems.id, id);
  const res = await getDb().update(newsItems).set({ status, reviewedBy, reviewedAt: new Date() }).where(where);
  return affected(res) > 0;
}

export interface NewsEdit {
  titleTh: string;
  summaryTh: string;
  categories: string[];
  importance: number;
}

export async function updateContent(id: string, edit: NewsEdit): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const res = await tx
      .update(newsItems)
      .set({ titleTh: edit.titleTh, summaryTh: edit.summaryTh, importance: edit.importance })
      .where(eq(newsItems.id, id));
    if (affected(res) === 0) return false;
    await tx.delete(newsCategories).where(eq(newsCategories.newsId, id));
    if (edit.categories.length > 0) {
      await tx.insert(newsCategories).values(edit.categories.map((categoryKey) => ({ newsId: id, categoryKey })));
    }
    return true;
  });
}

export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await getDb().select({ status: newsItems.status, n: count() }).from(newsItems).groupBy(newsItems.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export interface FetchRun {
  id: number;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "failed";
  message: string | null;
}

// รอบที่ค้างสถานะ running นานกว่านี้ถือว่าตายไปแล้ว (เช่น process ถูก kill) ให้แสดงเป็นล้มเหลว
const STALE_RUN_MS = 15 * 60_000;
const LOCK_NAME = "promptpilot_news_fetch";

// GET_LOCK ผูกกับ connection: ถือ connection นี้ไว้ตลอดรอบ ถ้า process ตาย MySQL ปล่อย lock ให้เอง
let lockConn: PoolConnection | null = null;

/** เริ่มรอบใหม่ — คืน null ถ้ามีรอบอื่นกำลังทำงานอยู่ (ไม่ว่าจากปุ่มใน admin หรือ Task Scheduler) */
export async function beginRun(trigger: string): Promise<number | null> {
  const conn = await getPool().getConnection();
  const [rows] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK(?, 0) AS got", [LOCK_NAME]);
  if (rows[0]?.got !== 1) {
    conn.release();
    return null;
  }
  lockConn = conn;
  const res = await getDb().insert(fetchRuns).values({ triggeredBy: trigger, startedAt: new Date(), status: "running" });
  return res[0].insertId;
}

export async function finishRun(id: number, status: "ok" | "failed", message: string): Promise<void> {
  await getDb().update(fetchRuns).set({ status, message, finishedAt: new Date() }).where(eq(fetchRuns.id, id));
  if (lockConn) {
    await lockConn.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    lockConn.release();
    lockConn = null;
  }
}

export async function latestRun(): Promise<FetchRun | null> {
  const [r] = await getDb().select().from(fetchRuns).orderBy(desc(fetchRuns.id)).limit(1);
  if (!r) return null;
  const stale = r.status === "running" && r.startedAt.getTime() < Date.now() - STALE_RUN_MS;
  return {
    id: r.id,
    trigger: r.triggeredBy,
    startedAt: r.startedAt.toISOString(),
    finishedAt: iso(r.finishedAt),
    status: stale ? "failed" : r.status,
    message: stale ? "รอบนี้หยุดทำงานกลางคันโดยไม่มีผลลัพธ์" : r.message,
  };
}
