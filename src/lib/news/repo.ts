import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { NewsItem, NewsStatus } from "./schema";

const DB_PATH = process.env.NEWS_DB_PATH ?? path.join(process.cwd(), "data", "news.db");

let db: DatabaseSync | undefined;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  // WAL: เว็บ (Next.js) อ่านได้ระหว่างที่สคริปต์ fetch กำลังเขียน
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS news_items (
      id           TEXT PRIMARY KEY,
      url          TEXT NOT NULL UNIQUE,
      source       TEXT NOT NULL,
      title        TEXT NOT NULL,
      snippet      TEXT NOT NULL DEFAULT '',
      published_at TEXT NOT NULL,
      fetched_at   TEXT NOT NULL,
      title_th     TEXT,
      summary_th   TEXT,
      categories   TEXT NOT NULL DEFAULT '[]',
      importance   INTEGER,
      ai_reason    TEXT,
      status       TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','auto_rejected')),
      reviewed_by  TEXT,
      reviewed_at  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_news_status_published ON news_items (status, published_at DESC);
    CREATE TABLE IF NOT EXISTS fetch_runs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger     TEXT NOT NULL,
      started_at  TEXT NOT NULL,
      finished_at TEXT,
      status      TEXT NOT NULL CHECK (status IN ('running','ok','failed')),
      message     TEXT
    );
  `);
  return db;
}

type Row = Record<string, unknown>;

function toItem(r: Row): NewsItem {
  return {
    id: r.id as string,
    url: r.url as string,
    source: r.source as string,
    title: r.title as string,
    snippet: r.snippet as string,
    publishedAt: r.published_at as string,
    fetchedAt: r.fetched_at as string,
    titleTh: (r.title_th as string | null) ?? null,
    summaryTh: (r.summary_th as string | null) ?? null,
    categories: JSON.parse(r.categories as string) as string[],
    importance: (r.importance as number | null) ?? null,
    aiReason: (r.ai_reason as string | null) ?? null,
    status: r.status as NewsStatus,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
  };
}

export type NewItem = Omit<NewsItem, "reviewedBy" | "reviewedAt">;

/** คืน id ที่มีอยู่แล้วใน DB (ใช้ตัดข่าวซ้ำก่อนส่งให้ Claude) */
export function findExistingIds(ids: string[]): Set<string> {
  if (ids.length === 0) return new Set();
  const placeholders = ids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT id FROM news_items WHERE id IN (${placeholders})`)
    .all(...ids) as Row[];
  return new Set(rows.map((r) => r.id as string));
}

export function insertItems(items: NewItem[]): number {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT OR IGNORE INTO news_items
      (id, url, source, title, snippet, published_at, fetched_at,
       title_th, summary_th, categories, importance, ai_reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let inserted = 0;
  d.exec("BEGIN");
  try {
    for (const it of items) {
      const res = stmt.run(
        it.id, it.url, it.source, it.title, it.snippet, it.publishedAt, it.fetchedAt,
        it.titleTh, it.summaryTh, JSON.stringify(it.categories), it.importance, it.aiReason, it.status,
      );
      inserted += Number(res.changes);
    }
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
  return inserted;
}

export function listByStatus(status: NewsStatus, limit = 100): NewsItem[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM news_items WHERE status = ?
       ORDER BY COALESCE(importance, 0) DESC, published_at DESC LIMIT ?`,
    )
    .all(status, limit) as Row[];
  return rows.map(toItem);
}

/** คืน false ถ้าไม่พบข่าว หรือจะอนุมัติข่าวที่ยังไม่มีหัวข้อ/คำสรุปภาษาไทย */
export function setStatus(id: string, status: NewsStatus, reviewedBy: string): boolean {
  const needsText = status === "approved" ? "AND title_th IS NOT NULL AND summary_th IS NOT NULL" : "";
  const res = getDb()
    .prepare(
      `UPDATE news_items SET status = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ? ${needsText}`,
    )
    .run(status, reviewedBy, new Date().toISOString(), id);
  return Number(res.changes) > 0;
}

export interface NewsEdit {
  titleTh: string;
  summaryTh: string;
  categories: string[];
  importance: number;
}

export function updateContent(id: string, edit: NewsEdit): boolean {
  const res = getDb()
    .prepare(
      `UPDATE news_items SET title_th = ?, summary_th = ?, categories = ?, importance = ?
       WHERE id = ?`,
    )
    .run(edit.titleTh, edit.summaryTh, JSON.stringify(edit.categories), edit.importance, id);
  return Number(res.changes) > 0;
}

export interface FetchRun {
  id: number;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "failed";
  message: string | null;
}

// รอบที่ค้างสถานะ running นานกว่านี้ถือว่าตายไปแล้ว (เช่น process ถูก kill) ไม่บล็อกรอบใหม่
const STALE_RUN_MS = 15 * 60_000;

/** เริ่มรอบใหม่แบบ atomic — คืน null ถ้ามีรอบอื่นกำลังทำงานอยู่ */
export function beginRun(trigger: string): number | null {
  const now = Date.now();
  const res = getDb()
    .prepare(
      `INSERT INTO fetch_runs (trigger, started_at, status)
       SELECT ?, ?, 'running'
       WHERE NOT EXISTS (SELECT 1 FROM fetch_runs WHERE status = 'running' AND started_at > ?)`,
    )
    .run(trigger, new Date(now).toISOString(), new Date(now - STALE_RUN_MS).toISOString());
  return Number(res.changes) > 0 ? Number(res.lastInsertRowid) : null;
}

export function finishRun(id: number, status: "ok" | "failed", message: string): void {
  getDb()
    .prepare(`UPDATE fetch_runs SET status = ?, message = ?, finished_at = ? WHERE id = ?`)
    .run(status, message, new Date().toISOString(), id);
}

export function latestRun(): FetchRun | null {
  const r = getDb().prepare(`SELECT * FROM fetch_runs ORDER BY id DESC LIMIT 1`).get() as Row | undefined;
  if (!r) return null;
  const startedAt = r.started_at as string;
  const stale = r.status === "running" && Date.parse(startedAt) < Date.now() - STALE_RUN_MS;
  return {
    id: Number(r.id),
    trigger: r.trigger as string,
    startedAt,
    finishedAt: (r.finished_at as string | null) ?? null,
    status: stale ? "failed" : (r.status as FetchRun["status"]),
    message: stale ? "รอบนี้หยุดทำงานกลางคันโดยไม่มีผลลัพธ์" : ((r.message as string | null) ?? null),
  };
}

export function countByStatus(): Record<string, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) AS n FROM news_items GROUP BY status`)
    .all() as Row[];
  return Object.fromEntries(rows.map((r) => [r.status as string, Number(r.n)]));
}
