import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guides, newsSources, promptTemplates, tools } from "@/db/schema";

type ToolRow = typeof tools.$inferSelect;
type PromptRow = typeof promptTemplates.$inferSelect;

/** แปลงแถวกลับเป็นรูปเดียวกับ entry ใน JSON เดิม — ฟิลด์ optional ที่เป็น null ต้องหายไป ไม่ใช่เป็น null เพราะ Zod schema ไม่รับ */
function toEntry(r: ToolRow): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    id: r.slug,
    name: r.name,
    vendor: r.vendor,
    modelId: r.modelId,
    releaseDate: r.releaseDate,
    sourceLabel: r.sourceLabel,
    verifiedAt: r.verifiedAt,
    status: r.status,
    url: r.url,
    sourceUrl: r.sourceUrl,
    benchmark: r.benchmark,
    priceUsdIn: r.priceUsdIn,
    priceUsdOut: r.priceUsdOut,
    priceNote: r.priceNote,
    bestFor: r.bestFor,
    summary: r.summary,
    accessMethod: r.accessMethod,
    installSteps: r.installSteps,
    ...r.extra,
  };
  if (r.warning !== null) entry.warning = r.warning;
  if (r.tags !== null) entry.tags = r.tags;
  return entry;
}

function toPrompt(r: PromptRow): Record<string, unknown> {
  const p: Record<string, unknown> = {
    task: r.task,
    goodPrompt: r.goodPrompt,
    why: r.why,
    tested: r.tested,
    testedAt: r.testedAt,
    testedWith: r.testedWith,
    sampleOutput: r.sampleOutput,
    draftNote: r.draftNote,
  };
  if (r.badPrompt !== null) p.badPrompt = r.badPrompt;
  if (r.sourceUrl !== null) p.sourceUrl = r.sourceUrl;
  return p;
}

/** entries ทุกหมวด (ยังไม่ validate) เรียงตาม sort_order — category key → entries */
export async function loadAllEntries(): Promise<Record<string, Record<string, unknown>[]>> {
  const rows = await getDb().select().from(tools).orderBy(asc(tools.categoryKey), asc(tools.sortOrder));
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const r of rows) (out[r.categoryKey] ??= []).push(toEntry(r));
  return out;
}

/** คู่มือทุกหมวดพร้อม prompt (ยังไม่ validate) — category key → guide */
export async function loadAllGuides(): Promise<Record<string, Record<string, unknown>>> {
  const db = getDb();
  const [guideRows, promptRows] = await Promise.all([
    db.select().from(guides),
    db.select().from(promptTemplates).orderBy(asc(promptTemplates.categoryKey), asc(promptTemplates.sortOrder)),
  ]);
  const prompts: Record<string, Record<string, unknown>[]> = {};
  for (const r of promptRows) (prompts[r.categoryKey] ??= []).push(toPrompt(r));
  const out: Record<string, Record<string, unknown>> = {};
  for (const g of guideRows) {
    const guide: Record<string, unknown> = {
      categoryKey: g.categoryKey,
      howToUse: g.howToUse,
      accessMethod: g.accessMethod,
      dataHandlingNote: g.dataHandlingNote,
      ...g.notes,
      promptTemplates: prompts[g.categoryKey] ?? [],
    };
    if (g.links !== null) guide.links = g.links;
    if (g.installSteps !== null) guide.installSteps = g.installSteps;
    out[g.categoryKey] = guide;
  }
  return out;
}

export async function listEnabledSources(): Promise<{ name: string; url: string }[]> {
  const rows = await getDb()
    .select({ name: newsSources.name, url: newsSources.url, enabled: newsSources.enabled })
    .from(newsSources)
    .orderBy(asc(newsSources.sortOrder), asc(newsSources.id));
  return rows.filter((r) => r.enabled).map(({ name, url }) => ({ name, url }));
}
