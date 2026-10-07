import { unstable_cache } from "next/cache";
import { z } from "zod";
import { loadAllEntries, loadAllGuides } from "./catalog/repo";
import { CATEGORIES, getCategory, getCategoriesGrouped, type CategoryMeta } from "./categories";
import { categoryGuideSchema, type CategoryGuide } from "./schema";

/** tag สำหรับ invalidate cache หลังแก้ข้อมูล (หน้า admin เรียก updateTag/revalidateTag) */
export const TOOLS_TAG = "tools";
export const GUIDES_TAG = "guides";

// cache ข้อมูลจาก DB ไว้ข้าม request; revalidate เป็นตาข่ายกันข้อมูลค้าง ถ้ามีคนแก้ DB ตรงโดยไม่ผ่าน admin
const cachedEntries = unstable_cache(loadAllEntries, ["catalog-entries"], { tags: [TOOLS_TAG], revalidate: 600 });
const cachedGuides = unstable_cache(loadAllGuides, ["catalog-guides"], { tags: [GUIDES_TAG], revalidate: 600 });

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - [${issue.path.join(".")}] ${issue.message}`).join("\n");
}

/**
 * อ่าน + validate entries ของหมวดเดียว ด้วย Zod schema ของหมวดนั้น
 * โยน error ที่อ่านง่ายถ้าข้อมูลไม่ตรง schema — กันข้อมูลผิดรูปแบบหลุดขึ้นเว็บ
 */
export async function getCategoryEntries<T = unknown>(key: string): Promise<T[]> {
  const category = getCategory(key);
  if (!category) throw new Error(`ไม่พบหมวด "${key}" ใน CATEGORIES`);

  const raw = (await cachedEntries())[key] ?? [];
  const result = z.array(category.schema).safeParse(raw);
  if (!result.success) {
    throw new Error(`ข้อมูลเครื่องมือในหมวด "${key}" (ตาราง tools) ไม่ตรง schema:\n${formatIssues(result.error)}`);
  }
  return result.data as T[];
}

/** คืน null ถ้าหมวดนั้นยังไม่มี guide */
export async function getCategoryGuide(key: string): Promise<CategoryGuide | null> {
  const raw = (await cachedGuides())[key];
  if (!raw) return null;

  const result = categoryGuideSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Guide ของหมวด "${key}" (ตาราง guides) ไม่ตรง schema:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

export interface CategoryWithEntries extends CategoryMeta {
  entries: Record<string, unknown>[];
}

export async function getAllCategoriesWithEntries(): Promise<CategoryWithEntries[]> {
  return Promise.all(
    CATEGORIES.map(async (category) => ({
      ...category,
      entries: await getCategoryEntries<Record<string, unknown>>(category.key),
    })),
  );
}

export { CATEGORIES, getCategory, getCategoriesGrouped };
