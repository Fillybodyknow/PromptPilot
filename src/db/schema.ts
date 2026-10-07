import {
  char,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import { NEWS_STATUSES } from "../lib/news/schema";

export const newsItems = mysqlTable(
  "news_items",
  {
    id: char("id", { length: 16 }).primaryKey(),
    url: text("url").notNull(),
    source: varchar("source", { length: 200 }).notNull(),
    title: text("title").notNull(),
    snippet: text("snippet").notNull(),
    publishedAt: datetime("published_at", { mode: "date", fsp: 3 }).notNull(),
    fetchedAt: datetime("fetched_at", { mode: "date", fsp: 3 }).notNull(),
    titleTh: varchar("title_th", { length: 500 }),
    summaryTh: text("summary_th"),
    importance: tinyint("importance"),
    aiReason: text("ai_reason"),
    status: mysqlEnum("status", NEWS_STATUSES).notNull(),
    reviewedBy: varchar("reviewed_by", { length: 100 }),
    reviewedAt: datetime("reviewed_at", { mode: "date", fsp: 3 }),
  },
  (t) => [index("idx_news_status_published").on(t.status, t.publishedAt)],
);

// แยกเป็นตาราง (ไม่เก็บเป็น JSON) เพื่อกรองข่าวตามหมวดผ่าน index ได้
export const newsCategories = mysqlTable(
  "news_categories",
  {
    newsId: char("news_id", { length: 16 })
      .notNull()
      .references(() => newsItems.id, { onDelete: "cascade" }),
    categoryKey: varchar("category_key", { length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.newsId, t.categoryKey] }), index("idx_news_categories_key").on(t.categoryKey)],
);

export const fetchRuns = mysqlTable("fetch_runs", {
  id: int("id").autoincrement().primaryKey(),
  triggeredBy: varchar("triggered_by", { length: 100 }).notNull(),
  startedAt: datetime("started_at", { mode: "date", fsp: 3 }).notNull(),
  finishedAt: datetime("finished_at", { mode: "date", fsp: 3 }),
  status: mysqlEnum("status", ["running", "ok", "failed"]).notNull(),
  message: text("message"),
});
