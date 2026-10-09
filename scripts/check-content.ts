/**
 * ให้ AI ตรวจข้อมูลเครื่องมือกับหน้าทางการของผู้ให้บริการ แล้วสร้าง "ข้อเสนอแก้ไข" ให้คนอนุมัติในหน้า /admin/suggestions
 *
 *   npx tsx scripts/check-content.ts --tool=<id>   ตรวจ 1 ตัว (ปุ่ม "ให้ AI ตรวจตัวนี้" ในหน้า admin สั่งให้)
 *   npm run content:check                           รอบอัตโนมัติ (Task Scheduler เรียกวันละครั้ง หลังดึงข่าว):
 *     1. ทุกวัน: เครื่องมือที่มีข่าวอนุมัติใหม่หลังจาก AI ตรวจครั้งล่าสุด
 *     2. สัปดาห์ละครั้ง: เครื่องมือที่ข้อมูลเก่ากว่า 30 วัน — ถ้าหน้าทางการไม่เปลี่ยนจากครั้งก่อนจะข้ามโดยไม่เรียก AI
 *
 * env: เหมือนการดึงข่าว (ANTHROPIC_API_KEY / OPENAI_API_KEY), CONTENT_CHECK_TRIGGER = ใครสั่ง
 *      CONTENT_CHECK_MAX_NEWS (ค่าเริ่มต้น 10), CONTENT_CHECK_MAX_STALE (ค่าเริ่มต้น 20) = จำนวนเครื่องมือสูงสุดต่อรอบ คุมค่า AI
 */
import { closeDb } from "../src/db/client";
import { hasAiKey } from "../src/lib/ai/structured";
import { beginCheckRun, finishCheckRun, recordRun } from "../src/lib/content/repo";
import { newsCandidates, staleCandidates, stalePassDue, type Candidate } from "../src/lib/content/schedule";
import { checkTool } from "../src/lib/content/toolCheck";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const limit = (name: string, fallback: number) => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

async function runOne(toolId: number, triggeredBy: string): Promise<void> {
  const runId = await beginCheckRun(triggeredBy, `tool:${toolId}`);
  if (runId === null) {
    console.log("มีการตรวจอื่นกำลังทำงานอยู่ — ข้ามรอบนี้");
    return;
  }
  try {
    const outcome = await checkTool(toolId, "manual", triggeredBy);
    console.log(outcome.message);
    await finishCheckRun(runId, "ok", outcome.message);
  } catch (err) {
    console.error(`❌ ${errorText(err)}`);
    await finishCheckRun(runId, "failed", errorText(err).slice(0, 2000));
    process.exitCode = 1;
  }
}

/** ตรวจทีละตัว บันทึกผลของแต่ละตัว และคืนสรุปจำนวน — ตัวที่พังไม่หยุดตัวอื่น */
async function pass(list: Candidate[], trigger: "news" | "stale", triggeredBy: string) {
  const tally = { suggested: 0, skipped: 0, failed: 0, manual: 0 };
  for (const c of list) {
    const started = new Date();
    try {
      const outcome = await checkTool(c.toolId, trigger, c.ref, { skipIfUnchanged: trigger === "stale" });
      console.log(`  ${outcome.message}`);
      // ตัวที่ข้ามเพราะหน้าไม่เปลี่ยน ไม่บันทึกผลทับ — ให้ผลตรวจจริงครั้งก่อน (เช่น "ต้องตรวจเอง") ยังแสดงในหน้า admin
      if (!outcome.skipped) await recordRun(`tool:${c.toolId}`, triggeredBy, started, "ok", outcome.message);
      if (outcome.suggestionId) tally.suggested++;
      else if (outcome.skipped) tally.skipped++;
      else tally.manual++; // เปิดหน้าไม่ได้ หรือ AI ไม่แน่ใจ — ต้องให้คนตรวจเอง
    } catch (err) {
      console.error(`  ❌ ${c.name}: ${errorText(err)}`);
      await recordRun(`tool:${c.toolId}`, triggeredBy, started, "failed", `${c.name}: ${errorText(err)}`);
      tally.failed++;
    }
  }
  return tally;
}

const describe = (label: string, n: number, t: Awaited<ReturnType<typeof pass>>) =>
  n === 0
    ? `${label}: ไม่มีเครื่องมือที่ต้องตรวจ`
    : `${label} ${n} ตัว: สร้างข้อเสนอ ${t.suggested}` +
      (t.skipped ? ` · หน้าไม่เปลี่ยน ข้าม ${t.skipped}` : "") +
      (t.manual ? ` · ต้องตรวจเอง ${t.manual}` : "") +
      (t.failed ? ` · ผิดพลาด ${t.failed}` : "");

async function runAuto(triggeredBy: string): Promise<void> {
  if (!hasAiKey()) {
    console.log("ยังไม่ได้ตั้ง API key ของ AI — ข้ามการตรวจอัตโนมัติ");
    return;
  }
  const runId = await beginCheckRun(triggeredBy, "auto");
  if (runId === null) {
    console.log("มีการตรวจอื่นกำลังทำงานอยู่ — ข้ามรอบนี้");
    return;
  }
  const summary: string[] = [];
  try {
    const news = await newsCandidates(limit("CONTENT_CHECK_MAX_NEWS", 10));
    console.log(`เครื่องมือที่มีข่าวใหม่: ${news.length} ตัว`);
    summary.push(describe("มีข่าวใหม่", news.length, await pass(news, "news", "auto:news")));

    if (await stalePassDue()) {
      const started = new Date();
      const stale = await staleCandidates(limit("CONTENT_CHECK_MAX_STALE", 20), new Set(news.map((c) => c.toolId)));
      console.log(`เครื่องมือที่ข้อมูลเก่า: ${stale.length} ตัว`);
      const t = await pass(stale, "stale", "auto:stale");
      const text = describe("ข้อมูลเก่า", stale.length, t);
      summary.push(text);
      // ทุกตัวพังหมด (เช่น AI เรียกไม่ได้) → นับเป็นรอบล้มเหลว พรุ่งนี้ลองใหม่
      await recordRun("auto:stale", triggeredBy, started, stale.length > 0 && t.failed === stale.length ? "failed" : "ok", text);
    } else {
      summary.push("ข้อมูลเก่า: ยังไม่ถึงรอบสัปดาห์");
    }
    console.log(summary.join("\n"));
    await finishCheckRun(runId, "ok", summary.join(" · "));
  } catch (err) {
    console.error(`❌ ${errorText(err)}`);
    await finishCheckRun(runId, "failed", [...summary, errorText(err)].join(" · ").slice(0, 2000));
    process.exitCode = 1;
  }
}

async function run(): Promise<void> {
  const toolArg = process.argv.find((a) => a.startsWith("--tool="))?.slice("--tool=".length);
  const triggeredBy = process.env.CONTENT_CHECK_TRIGGER ?? (toolArg === undefined ? "ตั้งเวลา" : "command line");
  if (toolArg === undefined) return runAuto(triggeredBy);
  const toolId = Number(toolArg);
  if (!Number.isInteger(toolId) || toolId <= 0) throw new Error("ระบุเครื่องมือ: --tool=<id>");
  return runOne(toolId, triggeredBy);
}

run()
  .catch((err) => {
    console.error(`❌ ${errorText(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
