/**
 * ย้ายข่าวและประวัติการดึงข่าวจาก SQLite เดิม (data/news.db) ไป MySQL ครั้งเดียว — รันซ้ำได้ ข่าวที่มีแล้วจะถูกข้าม
 * รัน: npm run db:import-sqlite [path/to/news.db]
 */
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { closeDb, getDb } from "../../src/db/client";
import { fetchRuns, newsCategories, newsItems } from "../../src/db/schema";
import { NEWS_STATUSES, type NewsStatus } from "../../src/lib/news/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const date = (v: unknown) => (v ? new Date(String(v)) : null);

async function main() {
  const file = process.argv[2] ?? "data/news.db";
  if (!existsSync(file)) throw new Error(`ไม่พบไฟล์ ${file}`);
  const src = new DatabaseSync(file, { readOnly: true });
  const db = getDb();

  const news = src.prepare("SELECT * FROM news_items").all() as Row[];
  let inserted = 0;
  for (const r of news) {
    const status = String(r.status) as NewsStatus;
    if (!NEWS_STATUSES.includes(status)) throw new Error(`สถานะไม่รู้จัก: ${status} (id ${r.id})`);
    const res = await db.insert(newsItems).ignore().values({
      id: String(r.id),
      url: String(r.url),
      source: String(r.source),
      title: String(r.title),
      snippet: String(r.snippet ?? ""),
      publishedAt: new Date(String(r.published_at)),
      fetchedAt: new Date(String(r.fetched_at)),
      titleTh: str(r.title_th),
      summaryTh: str(r.summary_th),
      importance: r.importance === null ? null : Number(r.importance),
      aiReason: str(r.ai_reason),
      status,
      reviewedBy: str(r.reviewed_by),
      reviewedAt: date(r.reviewed_at),
    });
    inserted += res[0].affectedRows;
    const cats = JSON.parse(String(r.categories ?? "[]")) as string[];
    if (cats.length > 0) {
      await db.insert(newsCategories).ignore().values(cats.map((categoryKey) => ({ newsId: String(r.id), categoryKey })));
    }
  }

  // fetch_runs ไม่มี key ที่ใช้ตัดซ้ำได้ จึงนำเข้าเฉพาะตอนที่ตารางปลายทางยังว่าง เพื่อให้รันซ้ำได้ปลอดภัย
  const hasRuns = src.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fetch_runs'").get();
  const targetEmpty = (await db.select({ id: fetchRuns.id }).from(fetchRuns).limit(1)).length === 0;
  const runs = hasRuns && targetEmpty ? (src.prepare("SELECT * FROM fetch_runs ORDER BY id").all() as Row[]) : [];
  for (const r of runs) {
    await db.insert(fetchRuns).values({
      triggeredBy: String(r.trigger),
      startedAt: new Date(String(r.started_at)),
      finishedAt: date(r.finished_at),
      status: r.status === "running" ? "failed" : (String(r.status) as "ok" | "failed"),
      message: str(r.message),
    });
  }
  console.log(`ข่าว: พบ ${news.length} ชิ้น นำเข้าใหม่ ${inserted} ชิ้น (ที่เหลือมีอยู่แล้ว) · ประวัติการดึงข่าว: ${runs.length} รอบ`);
}

main()
  .catch((err) => {
    console.error("❌", err);
    process.exitCode = 1;
  })
  .finally(closeDb);
