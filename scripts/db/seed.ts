/**
 * ใส่ข้อมูลตั้งต้น (เครื่องมือ คู่มือ prompt แหล่งข่าว) จาก scripts/db/seed/ ลง MySQL — ใช้ตอนตั้งฐานข้อมูลใหม่ครั้งแรก
 * หลังจากนั้นแก้เนื้อหาผ่านหน้า admin ไม่ใช่แก้ไฟล์ในโฟลเดอร์นี้
 *
 * รัน: npm run db:seed            (ไม่ทำอะไรถ้าตารางมีข้อมูลอยู่แล้ว)
 *      npm run db:seed -- --force (ลบข้อมูลเครื่องมือ/คู่มือ/แหล่งข่าวเดิมทั้งหมดแล้วใส่ใหม่ — ไม่แตะตารางข่าว)
 */
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { count } from "drizzle-orm";
import { z } from "zod";
import { closeDb, getDb } from "../../src/db/client";
import { guides, newsSources, promptTemplates, tools } from "../../src/db/schema";
import { loadAllEntries, loadAllGuides } from "../../src/lib/catalog/repo";
import { CATEGORIES } from "../../src/lib/categories";
import { newsSourceSchema } from "../../src/lib/news/schema";
import { baseEntrySchema, categoryGuideSchema, type CategoryGuide } from "../../src/lib/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

const SEED_DIR = "scripts/db/seed";
const TOOL_FILE: Record<string, string> = { "self-hosted": "open-weight-selfhosted" };
const BASE_KEYS = new Set(Object.keys(baseEntrySchema.shape));
const NOTE_KEYS = ["benchmarkNote", "thaiContextNote", "adoptionNote", "costNote", "accuracyNote"] as const;
// เครื่องมือที่โชว์ใน Spotlight หน้าแรกตอนย้ายข้อมูล (category key / id)
const FEATURED = new Set([
  "general-assistant/claude-opus-5",
  "business-writing/m365-copilot-word",
  "coding-tools/github-copilot",
  "data-analysis/power-bi-copilot",
  "image-gen/midjourney-v8",
  "meetings-transcription/fireflies-ai",
  "automation/n8n",
]);

const readJson = (path: string): unknown => JSON.parse(readFileSync(`${SEED_DIR}/${path}`, "utf8"));

function loadSeed() {
  const entries: Record<string, Record<string, unknown>[]> = {};
  const guideData: Record<string, CategoryGuide> = {};
  for (const c of CATEGORIES) {
    const file = `tools/${TOOL_FILE[c.key] ?? c.key}.json`;
    const parsed = z.array(c.schema).safeParse(readJson(file));
    if (!parsed.success) throw new Error(`${file} ไม่ตรง schema: ${parsed.error.message}`);
    entries[c.key] = parsed.data as Record<string, unknown>[];
    const guide = categoryGuideSchema.safeParse(readJson(`guides/${c.key}.json`));
    if (!guide.success) throw new Error(`guides/${c.key}.json ไม่ตรง schema: ${guide.error.message}`);
    guideData[c.key] = guide.data;
  }
  const sources = newsSourceSchema.parse(readJson("news-sources.json"));
  return { entries, guideData, sources };
}

/** null กับไม่มี key ถือว่าเท่ากัน (ฟิลด์ optional ที่เป็น null ใน JSON จะกลายเป็นไม่มี key หลังอ่านจาก DB) */
function normalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== null && x !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, normalize(x)]),
    );
  }
  return v;
}

async function main() {
  const force = process.argv.includes("--force");
  const db = getDb();
  const existing = await Promise.all([tools, guides, newsSources].map((t) => db.select({ n: count() }).from(t)));
  const hasData = existing.some(([r]) => r.n > 0);
  if (hasData && !force) {
    console.log("ตาราง tools/guides/news_sources มีข้อมูลอยู่แล้ว — ไม่ทำอะไร (ใช้ --force ถ้าต้องการลบแล้วใส่ใหม่)");
    return;
  }

  const { entries, guideData, sources } = loadSeed();
  const now = new Date();

  await db.transaction(async (tx) => {
    if (force) {
      await tx.delete(promptTemplates);
      await tx.delete(guides);
      await tx.delete(tools);
      await tx.delete(newsSources);
    }
    for (const c of CATEGORIES) {
      const rows = entries[c.key].map((e, i) => {
        const extra = Object.fromEntries(Object.entries(e).filter(([k]) => !BASE_KEYS.has(k)));
        return {
          categoryKey: c.key,
          slug: String(e.id),
          sortOrder: i,
          name: String(e.name),
          vendor: String(e.vendor),
          modelId: (e.modelId as string | null) ?? null,
          releaseDate: String(e.releaseDate),
          sourceLabel: e.sourceLabel as "official" | "community",
          verifiedAt: String(e.verifiedAt),
          status: e.status as (typeof tools.$inferInsert)["status"],
          url: String(e.url),
          sourceUrl: (e.sourceUrl as string | null) ?? null,
          benchmark: (e.benchmark as string | null) ?? null,
          priceUsdIn: (e.priceUsdIn as number | null) ?? null,
          priceUsdOut: (e.priceUsdOut as number | null) ?? null,
          priceNote: String(e.priceNote),
          bestFor: String(e.bestFor),
          summary: String(e.summary),
          warning: (e.warning as string | null | undefined) ?? null,
          accessMethod: e.accessMethod as (typeof tools.$inferInsert)["accessMethod"],
          installSteps: e.installSteps as string[],
          tags: (e.tags as string[] | undefined) ?? null,
          extra,
          featured: FEATURED.has(`${c.key}/${e.id}`),
          updatedAt: now,
          updatedBy: "seed",
        };
      });
      if (rows.length > 0) await tx.insert(tools).values(rows);

      const g = guideData[c.key];
      const notes = Object.fromEntries(NOTE_KEYS.filter((k) => g[k]).map((k) => [k, g[k] as string]));
      await tx.insert(guides).values({
        categoryKey: c.key,
        howToUse: g.howToUse,
        accessMethod: g.accessMethod,
        links: g.links ?? null,
        installSteps: g.installSteps ?? null,
        dataHandlingNote: g.dataHandlingNote,
        notes,
        updatedAt: now,
        updatedBy: "seed",
      });
      await tx.insert(promptTemplates).values(
        g.promptTemplates.map((p, i) => ({
          categoryKey: c.key,
          sortOrder: i,
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
        })),
      );
    }
    await tx.insert(newsSources).values(sources.map((s, i) => ({ name: s.name, url: s.url, sortOrder: i, createdAt: now })));
  });

  // อ่านกลับจาก DB ด้วยตัวอ่านเดียวกับที่เว็บใช้ แล้วเทียบกับไฟล์ต้นทาง
  const [dbEntries, dbGuides] = await Promise.all([loadAllEntries(), loadAllGuides()]);
  const mismatches: string[] = [];
  let toolCount = 0;
  let promptCount = 0;
  for (const c of CATEGORIES) {
    const fromDb = z.array(c.schema).parse(dbEntries[c.key] ?? []);
    if (!isDeepStrictEqual(normalize(fromDb), normalize(entries[c.key]))) mismatches.push(`tools/${c.key}`);
    const guide = categoryGuideSchema.parse(dbGuides[c.key]);
    if (!isDeepStrictEqual(normalize(guide), normalize(guideData[c.key]))) mismatches.push(`guides/${c.key}`);
    toolCount += fromDb.length;
    promptCount += guide.promptTemplates.length;
  }
  console.log(`ใส่ข้อมูลแล้ว: เครื่องมือ ${toolCount}, คู่มือ ${Object.keys(dbGuides).length}, prompt ${promptCount}, แหล่งข่าว ${sources.length}`);
  if (mismatches.length > 0) throw new Error(`ข้อมูลที่อ่านกลับจาก DB ไม่ตรงกับไฟล์ต้นทาง: ${mismatches.join(", ")}`);
  console.log("✅ อ่านกลับจาก DB แล้วตรงกับไฟล์ต้นทางทุกหมวด");
}

main()
  .catch((err) => {
    console.error("❌", err);
    process.exitCode = 1;
  })
  .finally(closeDb);
