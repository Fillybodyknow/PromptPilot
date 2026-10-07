import { and, count, desc, eq, gte, inArray, like, ne, or, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDb } from "@/db/client";
import { newsCategories, newsItems } from "@/db/schema";
import { publisherOf } from "./publisher";
import { duplicatesOf, toItems } from "./repo";
import type { NewsItem } from "./schema";

/** หน้าเว็บสาธารณะเห็นเฉพาะข่าว approved — admin สั่ง invalidate tag นี้ทุกครั้งที่สถานะหรือเนื้อหาข่าวเปลี่ยน */
export const NEWS_TAG = "news";

export interface PublicNews extends NewsItem {
  /** ข่าวจากแหล่งอื่นที่รายงานเรื่องเดียวกัน */
  otherSources: { title: string; publisher: string; url: string }[];
}

export interface NewsQuery {
  categories?: string[];
  importance?: number;
  sinceDays?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

async function withSources(items: NewsItem[]): Promise<PublicNews[]> {
  const dups = await duplicatesOf(
    items.map((i) => i.id),
    { confirmedOnly: true },
  );
  return items.map((i) => ({
    ...i,
    otherSources: (dups.get(i.id) ?? []).map((d) => ({ title: d.titleTh ?? d.title, publisher: publisherOf(d), url: d.url })),
  }));
}

function approvedWhere(query: NewsQuery): SQL {
  const conds: SQL[] = [eq(newsItems.status, "approved")];
  if (query.categories?.length) {
    const ids = getDb()
      .select({ id: newsCategories.newsId })
      .from(newsCategories)
      .where(inArray(newsCategories.categoryKey, query.categories));
    conds.push(inArray(newsItems.id, ids));
  }
  if (query.importance) conds.push(eq(newsItems.importance, query.importance));
  if (query.sinceDays) conds.push(gte(newsItems.publishedAt, new Date(Date.now() - query.sinceDays * 86_400_000)));
  const q = query.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conds.push(or(like(newsItems.titleTh, pattern), like(newsItems.summaryTh, pattern), like(newsItems.title, pattern))!);
  }
  return and(...conds)!;
}

async function queryApproved(query: NewsQuery): Promise<{ items: PublicNews[]; total: number }> {
  const pageSize = query.pageSize ?? 20;
  const page = Math.max(1, query.page ?? 1);
  const where = approvedWhere(query);
  const db = getDb();
  const [rows, [{ n }]] = await Promise.all([
    db
      .select()
      .from(newsItems)
      .where(where)
      .orderBy(desc(newsItems.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(newsItems).where(where),
  ]);
  return { items: await withSources(await toItems(rows)), total: n };
}

/** ข่าวเด่น: สำคัญที่สุดก่อน ในช่วงไม่กี่วันล่าสุด */
async function queryTopStories(days: number, limit: number): Promise<PublicNews[]> {
  const rows = await getDb()
    .select()
    .from(newsItems)
    .where(approvedWhere({ sinceDays: days }))
    .orderBy(desc(newsItems.importance), desc(newsItems.publishedAt))
    .limit(limit);
  return withSources(await toItems(rows));
}

async function queryById(id: string): Promise<PublicNews | null> {
  const rows = await getDb()
    .select()
    .from(newsItems)
    .where(and(eq(newsItems.id, id), eq(newsItems.status, "approved")));
  if (rows.length === 0) return null;
  return (await withSources(await toItems(rows)))[0];
}

async function queryRelated(categories: string[], excludeId: string, limit: number): Promise<PublicNews[]> {
  if (categories.length === 0) return [];
  const rows = await getDb()
    .select()
    .from(newsItems)
    .where(and(approvedWhere({ categories }), ne(newsItems.id, excludeId)))
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);
  return withSources(await toItems(rows));
}

// unstable_cache เขียนไฟล์ลงดิสก์ต่อ 1 ชุดอาร์กิวเมนต์ — cache เฉพาะ query ที่จำนวนแบบมีขอบเขต
// (คำค้นอิสระ หน้าลึกๆ และ id ใดๆ ที่คนนอกสุ่มส่งมาได้ ไม่ cache เพื่อกันดิสก์เต็ม)
const opts = { tags: [NEWS_TAG], revalidate: 600 };
const cachedApproved = unstable_cache(queryApproved, ["news-approved"], opts);
export const listApprovedNews = (query: NewsQuery) =>
  query.q || (query.page ?? 1) > 3 ? queryApproved(query) : cachedApproved(query);
export const getTopStories = unstable_cache(queryTopStories, ["news-top"], opts);
/** ไม่ cache ข้ามคำขอ (id มีได้ไม่จำกัด) — React cache() กันยิง query ซ้ำระหว่าง generateMetadata กับ page */
export const getApprovedNews = cache(queryById);
export const getRelatedNews = unstable_cache(queryRelated, ["news-related"], opts);
