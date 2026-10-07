import { and, asc, count, desc, eq, max, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { fetchRuns, guides, newsSources, promptTemplates, tools } from "@/db/schema";
import { baseEntrySchema, type CategoryGuide, type PromptTemplate } from "@/lib/schema";

// ฟังก์ชันเขียนข้อมูลสำหรับหน้า admin — ผู้เรียกต้องตรวจข้อมูลด้วย Zod schema ของหมวดนั้นมาก่อนแล้ว

export type ToolRow = typeof tools.$inferSelect;
export type PromptRow = typeof promptTemplates.$inferSelect;
export type SourceRow = typeof newsSources.$inferSelect;

const BASE_KEYS = new Set(Object.keys(baseEntrySchema.shape));

/** entry ที่ผ่าน schema แล้ว → ค่าคอลัมน์ของตาราง tools */
function toColumns(entry: Record<string, unknown>) {
  return {
    slug: String(entry.id),
    name: String(entry.name),
    vendor: String(entry.vendor),
    modelId: (entry.modelId as string | null) ?? null,
    releaseDate: String(entry.releaseDate),
    sourceLabel: entry.sourceLabel as ToolRow["sourceLabel"],
    verifiedAt: String(entry.verifiedAt),
    status: entry.status as ToolRow["status"],
    url: String(entry.url),
    sourceUrl: (entry.sourceUrl as string | null) ?? null,
    benchmark: (entry.benchmark as string | null) ?? null,
    priceUsdIn: (entry.priceUsdIn as number | null) ?? null,
    priceUsdOut: (entry.priceUsdOut as number | null) ?? null,
    priceNote: String(entry.priceNote),
    bestFor: String(entry.bestFor),
    summary: String(entry.summary),
    warning: (entry.warning as string | null | undefined) ?? null,
    accessMethod: entry.accessMethod as ToolRow["accessMethod"],
    installSteps: entry.installSteps as string[],
    tags: (entry.tags as string[] | undefined) ?? null,
    extra: Object.fromEntries(Object.entries(entry).filter(([k]) => !BASE_KEYS.has(k))),
  };
}

export async function listToolRows(categoryKey?: string): Promise<ToolRow[]> {
  return getDb()
    .select()
    .from(tools)
    .where(categoryKey ? eq(tools.categoryKey, categoryKey) : undefined)
    .orderBy(asc(tools.categoryKey), asc(tools.sortOrder), asc(tools.id));
}

export async function getToolRow(id: number): Promise<ToolRow | null> {
  const [row] = await getDb().select().from(tools).where(eq(tools.id, id));
  return row ?? null;
}

async function slugTaken(categoryKey: string, slug: string, exceptId?: number): Promise<boolean> {
  const [r] = await getDb()
    .select({ n: count() })
    .from(tools)
    .where(and(eq(tools.categoryKey, categoryKey), eq(tools.slug, slug), exceptId ? ne(tools.id, exceptId) : undefined));
  return r.n > 0;
}

/** คืน id ใหม่ หรือ null ถ้า slug ซ้ำในหมวดเดียวกัน */
export async function createTool(categoryKey: string, entry: Record<string, unknown>, featured: boolean, user: string): Promise<number | null> {
  const cols = toColumns(entry);
  if (await slugTaken(categoryKey, cols.slug)) return null;
  return getDb().transaction(async (tx) => {
    // lock แถวในหมวดก่อนอ่านลำดับสูงสุด — กันสร้างพร้อมกันแล้วได้เลขลำดับซ้ำ
    await tx.select({ id: tools.id }).from(tools).where(eq(tools.categoryKey, categoryKey)).for("update");
    const [{ top }] = await tx.select({ top: max(tools.sortOrder) }).from(tools).where(eq(tools.categoryKey, categoryKey));
    const res = await tx
      .insert(tools)
      .values({ ...cols, categoryKey, sortOrder: (top ?? -1) + 1, featured, updatedAt: new Date(), updatedBy: user });
    return res[0].insertId;
  });
}

/** คืน false ถ้าไม่พบ หรือ slug ไปซ้ำกับเครื่องมืออื่นในหมวดเดียวกัน */
export async function updateTool(id: number, entry: Record<string, unknown>, featured: boolean, user: string): Promise<boolean> {
  const row = await getToolRow(id);
  if (!row) return false;
  const cols = toColumns(entry);
  if (await slugTaken(row.categoryKey, cols.slug, id)) return false;
  await getDb().update(tools).set({ ...cols, featured, updatedAt: new Date(), updatedBy: user }).where(eq(tools.id, id));
  return true;
}

export async function deleteTool(id: number): Promise<void> {
  await getDb().delete(tools).where(eq(tools.id, id));
}

/**
 * เลื่อนขึ้น/ลงในหมวดเดียวกัน — lock ทุกแถวของหมวดแล้วเรียงเลขลำดับใหม่ 0..n-1
 * (ถ้าสลับแค่ 2 แถวโดยไม่ lock admin 2 คนกดพร้อมกันอาจได้เลขลำดับซ้ำ แล้วปุ่ม ↑/↓ จะใช้ไม่ได้กับแถวนั้น)
 */
async function moveInCategory(table: typeof tools | typeof promptTemplates, id: number, direction: "up" | "down") {
  const t = table as typeof tools; // ทั้งสองตารางมี id, categoryKey, sortOrder แบบเดียวกัน
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select({ categoryKey: t.categoryKey }).from(t).where(eq(t.id, id));
    if (!row) return;
    const rows = await tx
      .select({ id: t.id })
      .from(t)
      .where(eq(t.categoryKey, row.categoryKey))
      .orderBy(asc(t.sortOrder), asc(t.id))
      .for("update");
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (const [order, rowId] of ids.entries()) await tx.update(t).set({ sortOrder: order }).where(eq(t.id, rowId));
  });
}

export const moveTool = (id: number, direction: "up" | "down") => moveInCategory(tools, id, direction);
export const movePrompt = (id: number, direction: "up" | "down") => moveInCategory(promptTemplates, id, direction);

export type GuideFields = Omit<CategoryGuide, "promptTemplates" | "categoryKey">;

export async function saveGuide(categoryKey: string, g: GuideFields, user: string): Promise<void> {
  const notes = Object.fromEntries(
    (["benchmarkNote", "thaiContextNote", "adoptionNote", "costNote", "accuracyNote"] as const).filter((k) => g[k]).map((k) => [k, g[k] as string]),
  );
  const values = {
    howToUse: g.howToUse,
    accessMethod: g.accessMethod,
    links: g.links?.length ? g.links : null,
    installSteps: g.installSteps?.length ? g.installSteps : null,
    dataHandlingNote: g.dataHandlingNote,
    notes,
    updatedAt: new Date(),
    updatedBy: user,
  };
  await getDb().insert(guides).values({ categoryKey, ...values }).onDuplicateKeyUpdate({ set: values });
}

export async function listPromptRows(categoryKey: string): Promise<PromptRow[]> {
  return getDb()
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.categoryKey, categoryKey))
    .orderBy(asc(promptTemplates.sortOrder), asc(promptTemplates.id));
}

function promptColumns(p: PromptTemplate) {
  return {
    task: p.task,
    badPrompt: p.badPrompt ?? null,
    goodPrompt: p.goodPrompt,
    why: p.why,
    tested: p.tested,
    testedAt: p.testedAt,
    testedWith: p.testedWith,
    sampleOutput: p.sampleOutput,
    draftNote: p.draftNote,
    sourceUrl: p.sourceUrl ?? null,
  };
}

/** คืน false ถ้าหมวดนี้ยังไม่มีคู่มือ (prompt ต้องผูกกับคู่มือ) */
export async function createPrompt(categoryKey: string, p: PromptTemplate): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    // lock แถวคู่มือ — ให้การสร้าง/ลบ prompt ของหมวดเดียวกันทำทีละรายการ
    const [guide] = await tx.select({ key: guides.categoryKey }).from(guides).where(eq(guides.categoryKey, categoryKey)).for("update");
    if (!guide) return false;
    const [{ top }] = await tx.select({ top: max(promptTemplates.sortOrder) }).from(promptTemplates).where(eq(promptTemplates.categoryKey, categoryKey));
    await tx.insert(promptTemplates).values({ ...promptColumns(p), categoryKey, sortOrder: (top ?? -1) + 1 });
    return true;
  });
}

/** คืน false ถ้าไม่พบ prompt นี้ในหมวดนั้น (เช่น ถูกลบไปจากอีกแท็บ) */
export async function updatePrompt(id: number, categoryKey: string, p: PromptTemplate): Promise<boolean> {
  const res = await getDb()
    .update(promptTemplates)
    .set(promptColumns(p))
    .where(and(eq(promptTemplates.id, id), eq(promptTemplates.categoryKey, categoryKey)));
  return res[0].affectedRows > 0;
}

/** ไม่ยอมลบ prompt ตัวสุดท้ายของหมวด — คู่มือต้องมีอย่างน้อย 1 ตัว ไม่อย่างนั้นคู่มือจะหายจากหน้าเว็บ */
export async function deletePrompt(id: number, categoryKey: string): Promise<"deleted" | "last" | "missing"> {
  return getDb().transaction(async (tx) => {
    // lock แถวคู่มือก่อนนับ — กัน admin 2 คนลบ 2 ตัวสุดท้ายพร้อมกันแล้วเหลือ 0
    await tx.select({ key: guides.categoryKey }).from(guides).where(eq(guides.categoryKey, categoryKey)).for("update");
    const [row] = await tx
      .select({ id: promptTemplates.id })
      .from(promptTemplates)
      .where(and(eq(promptTemplates.id, id), eq(promptTemplates.categoryKey, categoryKey)));
    if (!row) return "missing";
    const [{ n }] = await tx.select({ n: count() }).from(promptTemplates).where(eq(promptTemplates.categoryKey, categoryKey));
    if (n <= 1) return "last";
    await tx.delete(promptTemplates).where(eq(promptTemplates.id, id));
    return "deleted";
  });
}

export async function listSourceRows(): Promise<SourceRow[]> {
  return getDb().select().from(newsSources).orderBy(asc(newsSources.sortOrder), asc(newsSources.id));
}

export async function getSourceRow(id: number): Promise<SourceRow | null> {
  const [row] = await getDb().select().from(newsSources).where(eq(newsSources.id, id));
  return row ?? null;
}

export async function createSource(name: string, url: string): Promise<void> {
  const db = getDb();
  const [{ top }] = await db.select({ top: max(newsSources.sortOrder) }).from(newsSources);
  await db.insert(newsSources).values({ name, url, sortOrder: (top ?? -1) + 1, createdAt: new Date() });
}

export async function setSourceEnabled(id: number, enabled: boolean): Promise<void> {
  await getDb().update(newsSources).set({ enabled }).where(eq(newsSources.id, id));
}

export async function deleteSource(id: number): Promise<void> {
  await getDb().delete(newsSources).where(eq(newsSources.id, id));
}

export async function listRuns(limit = 50) {
  return getDb().select().from(fetchRuns).orderBy(desc(fetchRuns.id)).limit(limit);
}

export async function catalogCounts() {
  const db = getDb();
  const [[t], [g], [p], [s]] = await Promise.all([
    db.select({ n: count() }).from(tools),
    db.select({ n: count() }).from(guides),
    db.select({ n: count() }).from(promptTemplates),
    db.select({ n: count() }).from(newsSources).where(eq(newsSources.enabled, true)),
  ]);
  return { tools: t.n, guides: g.n, prompts: p.n, enabledSources: s.n };
}
