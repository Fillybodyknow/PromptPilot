import { z } from "zod";
import { CATEGORIES } from "../categories";

const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));
export const isCategoryKey = (key: string) => CATEGORY_KEYS.has(key);

// duplicate = ข่าวเรื่องเดียวกับข่าวอื่น (duplicateOf) — ไม่ต้องอนุมัติ แสดงเป็น "แหล่งอื่นที่รายงานเรื่องนี้" ใต้ข่าวหลัก
export const NEWS_STATUSES = ["pending", "approved", "rejected", "auto_rejected", "duplicate"] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

export const newsSourceSchema = z.array(z.object({ name: z.string(), url: z.url() }));
export type NewsSource = z.infer<typeof newsSourceSchema>[number];

/** ผลที่ Claude ส่งกลับต่อ 1 batch — ใช้เป็น structured output schema โดยตรง */
export const enrichmentSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      relevant: z.boolean(),
      titleTh: z.string(),
      summaryTh: z.string(),
      // ไม่ใช้ z.enum: SDK ย้าย enum ไปไว้ใน description (API ไม่บังคับ) ถ้า Claude ตอบหมวดนอกรายการ
      // ทั้ง batch จะ parse ไม่ผ่าน — กรองด้วย isCategoryKey หลังได้ผลแทน
      categories: z.array(z.string()),
      importance: z.number().int(),
      reason: z.string(),
      // "" = ไม่มีคำแนะนำสำหรับบทบาทนั้น (ใช้ "" แทน null เพื่อให้ structured output ของทั้งสอง SDK รับได้แน่นอน)
      roleEmployee: z.string(),
      roleIt: z.string(),
      roleExec: z.string(),
      // id ของข่าวที่เป็นเรื่องเดียวกัน (จากรายการข่าวที่มีอยู่แล้ว หรือข่าวอื่นใน batch เดียวกัน) — "" = ไม่ซ้ำ
      duplicateOf: z.string(),
      // id ของเครื่องมือจากรายการที่ส่งให้ ที่ข่าวพูดถึงโดยตรง ([] = ไม่มี)
      toolIds: z.array(z.number().int()),
    }),
  ),
});
export type Enrichment = z.infer<typeof enrichmentSchema>["items"][number];

export interface NewsItem {
  id: string;
  url: string;
  source: string;
  title: string;
  snippet: string;
  publishedAt: string;
  fetchedAt: string;
  titleTh: string | null;
  summaryTh: string | null;
  categories: string[];
  /** id แถวในตาราง tools ที่ข่าวนี้พูดถึง */
  toolIds: number[];
  importance: number | null;
  aiReason: string | null;
  roleEmployee: string | null;
  roleIt: string | null;
  roleExec: string | null;
  duplicateOf: string | null;
  status: NewsStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
}
