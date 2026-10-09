import { and, eq, gt, max, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newsItems, newsTools, tools, watchPages } from "@/db/schema";
import { latestCheckRunFor } from "./repo";

/** ข่าวที่ใหม่กว่านี้ถึงจะสั่งตรวจ — ข่าวเก่ากว่ามักสะท้อนในข้อมูลไปแล้วหรือหมดความสำคัญ */
const NEWS_WINDOW_DAYS = 7;
/** ข้อมูลที่ตรวจล่าสุด (verifiedAt) เก่ากว่านี้ = ข้อมูลเก่า */
export const STALE_AFTER_DAYS = 30;
/** เครื่องมือที่ AI เพิ่งตรวจไปไม่นาน ไม่ต้องตรวจซ้ำในรอบข้อมูลเก่า — น้อยกว่ารอบสัปดาห์เล็กน้อย ไม่อย่างนั้นตัวที่ตรวจรอบก่อนจะตกรอบนี้ทุกครั้ง */
const RECHECK_AFTER_DAYS = 6;
/** รอบตรวจข้อมูลเก่าห่างกันอย่างน้อยเท่านี้ (task รันทุกวัน แต่ส่วนนี้ทำสัปดาห์ละครั้ง) */
const STALE_PASS_EVERY_MS = 6.5 * 86_400_000;

const DAY = 86_400_000;

/** เวลาที่ AI ตรวจเครื่องมือแต่ละตัวล่าสุด (จากหน้าทางการที่เปิดล่าสุด) */
async function lastCheckedByTool(): Promise<Map<number, Date>> {
  const rows = await getDb()
    .select({ toolId: watchPages.toolId, at: max(watchPages.lastCheckedAt) })
    .from(watchPages)
    .groupBy(watchPages.toolId);
  return new Map(rows.filter((r) => r.at).map((r) => [r.toolId, r.at as Date]));
}

export interface Candidate {
  toolId: number;
  name: string;
  /** เหตุผลที่เลือก (บันทึกเป็น triggerRef ของข้อเสนอ) */
  ref: string;
}

/** เครื่องมือที่มีข่าวอนุมัติใหม่หลังจากที่ AI ตรวจครั้งล่าสุด — ข่าวใหม่สุดก่อน */
export async function newsCandidates(limit: number): Promise<Candidate[]> {
  // mapWith: ให้แปลงค่าแบบเดียวกับคอลัมน์ (UTC) — ถ้าไม่ใส่จะได้ข้อความที่ new Date() อ่านเป็นเวลาไทย คลาดไป 7 ชั่วโมง
  const approvedAt = sql<Date>`coalesce(${newsItems.reviewedAt}, ${newsItems.publishedAt})`.mapWith(newsItems.publishedAt);
  const rows = await getDb()
    .select({ toolId: newsTools.toolId, name: tools.name, title: newsItems.titleTh, at: approvedAt })
    .from(newsTools)
    .innerJoin(newsItems, eq(newsItems.id, newsTools.newsId))
    .innerJoin(tools, eq(tools.id, newsTools.toolId))
    .where(and(eq(newsItems.status, "approved"), gt(approvedAt, new Date(Date.now() - NEWS_WINDOW_DAYS * DAY))));
  const checked = await lastCheckedByTool();
  const byTool = new Map<number, { name: string; at: Date; titles: string[] }>();
  for (const r of rows) {
    const at = r.at;
    const last = checked.get(r.toolId);
    if (last && at <= last) continue; // AI ตรวจหลังข่าวนี้แล้ว
    const cur = byTool.get(r.toolId) ?? { name: r.name, at, titles: [] };
    if (at > cur.at) cur.at = at;
    if (r.title) cur.titles.push(r.title);
    byTool.set(r.toolId, cur);
  }
  return [...byTool.entries()]
    .sort((a, b) => b[1].at.getTime() - a[1].at.getTime())
    .slice(0, limit)
    .map(([toolId, v]) => ({ toolId, name: v.name, ref: `ข่าว: ${v.titles.slice(0, 2).join(" · ")}`.slice(0, 320) }));
}

/** เครื่องมือที่ข้อมูลเก่าและ AI ไม่ได้ตรวจมาสักพัก — เก่าที่สุดก่อน */
export async function staleCandidates(limit: number, exclude: Set<number>): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * DAY).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  const rows = await getDb().select({ id: tools.id, name: tools.name, verifiedAt: tools.verifiedAt }).from(tools);
  const checked = await lastCheckedByTool();
  const recent = Date.now() - RECHECK_AFTER_DAYS * DAY;
  return rows
    .filter((r) => !exclude.has(r.id) && r.verifiedAt < cutoff && (checked.get(r.id)?.getTime() ?? 0) < recent)
    .sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt) || (checked.get(a.id)?.getTime() ?? 0) - (checked.get(b.id)?.getTime() ?? 0))
    .slice(0, limit)
    .map((r) => ({ toolId: r.id, name: r.name, ref: `ข้อมูลตรวจล่าสุด ${r.verifiedAt}` }));
}

/** ถึงรอบตรวจข้อมูลเก่าประจำสัปดาห์หรือยัง */
export async function stalePassDue(): Promise<boolean> {
  const last = await latestCheckRunFor("auto:stale");
  // รอบที่ล้มเหลว (เช่น AI เรียกไม่ได้) ลองใหม่ในวันถัดไป ไม่ต้องรอครบสัปดาห์
  return !last || last.status === "failed" || last.startedAt.getTime() < Date.now() - STALE_PASS_EVERY_MS;
}
