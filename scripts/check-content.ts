/**
 * ให้ AI ตรวจข้อมูลเครื่องมือกับหน้าทางการของผู้ให้บริการ แล้วสร้าง "ข้อเสนอแก้ไข" ให้คนอนุมัติในหน้า /admin/suggestions
 *
 *   npm run content:check -- --tool=<id>     ตรวจเครื่องมือ 1 ตัว (ปุ่ม "ให้ AI ตรวจตัวนี้" ในหน้า admin สั่งให้)
 *   npm run content:check -- --guide=<หมวด>  ทบทวนคู่มือ 1 หมวด (ปุ่มในหน้าแก้คู่มือ)
 *   npm run content:check                     รอบอัตโนมัติ (Task Scheduler เรียกวันละครั้ง หลังดึงข่าว):
 *     1. ทุกวัน: เครื่องมือที่มีข่าวอนุมัติใหม่หลังจาก AI ตรวจครั้งล่าสุด
 *     2. สัปดาห์ละครั้ง: เครื่องมือที่ข้อมูลเก่ากว่า 30 วัน — ถ้าหน้าทางการไม่เปลี่ยนจากครั้งก่อนจะข้ามโดยไม่เรียก AI
 *     3. เดือนละครั้ง: ทบทวนคู่มือทุกหมวดจากข่าวเดือนที่ผ่านมา — เสนอแก้คู่มือ ร่าง prompt ใหม่ และเครื่องมือที่ควรเพิ่ม
 *
 * env: เหมือนการดึงข่าว (ANTHROPIC_API_KEY / OPENAI_API_KEY), CONTENT_CHECK_TRIGGER = ใครสั่ง
 *      AI_MONTHLY_BUDGET_THB = งบ AI ต่อเดือน (บาท) — เกินงบแล้วรอบอัตโนมัติหยุด (ดึงข่าวและการสั่งตรวจเองยังทำได้)
 *      CONTENT_CHECK_MAX_NEWS (ค่าเริ่มต้น 10), CONTENT_CHECK_MAX_STALE (ค่าเริ่มต้น 20) = จำนวนเครื่องมือสูงสุดต่อรอบ คุมค่า AI
 */
import { closeDb } from "../src/db/client";
import { hasAiKey } from "../src/lib/ai/structured";
import { budgetStatus } from "../src/lib/ai/usage";
import { beginCheckRun, finishCheckRun, recordRun } from "../src/lib/content/repo";
import { CATEGORIES, getCategory } from "../src/lib/categories";
import { checkGuide } from "../src/lib/content/guideCheck";
import { guideReviewedRecently, monthlyPassDue, newsCandidates, staleCandidates, stalePassDue, type Candidate } from "../src/lib/content/schedule";
import { checkTool } from "../src/lib/content/toolCheck";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

const PROCESS_START = Date.now();

/** เกินงบ AI เดือนนี้แล้วหรือยัง — เช็กก่อนเรียก AI ทุกรายการในรอบอัตโนมัติ (ค่าใช้จ่ายเพิ่มระหว่างรอบ) */
async function overBudget(): Promise<string | null> {
  const b = await budgetStatus();
  return b.level === "over" ? `เกินงบ AI เดือนนี้ (${Math.round(b.spentThb)}/${b.budgetThb} บาท)` : null;
}
/** หลังจากนี้ไม่เริ่มหมวดคู่มือใหม่ (task ถูกตัดที่ 1 ชม. และ AI 1 ครั้งอาจนานหลายนาที) */
const MONTHLY_DEADLINE_MS = 40 * 60_000;

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const limit = (name: string, fallback: number) => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

/** ตรวจรายการเดียวที่คนสั่ง (เครื่องมือหรือคู่มือ) — บันทึกเป็นรอบของ scope นั้น */
async function runOne(scope: string, check: () => Promise<{ message: string }>, triggeredBy: string): Promise<void> {
  const runId = await beginCheckRun(triggeredBy, scope);
  if (runId === null) {
    console.log("มีการตรวจอื่นกำลังทำงานอยู่ — ข้ามรอบนี้");
    return;
  }
  try {
    const outcome = await check();
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
  const tally = { suggested: 0, skipped: 0, failed: 0, manual: 0, budget: 0 };
  for (const c of list) {
    if (await overBudget()) {
      tally.budget++;
      continue;
    }
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
      (t.failed ? ` · ผิดพลาด ${t.failed}` : "") +
      (t.budget ? ` · ข้าม ${t.budget} ตัวเพราะเกินงบ AI` : "");

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
      // ทุกตัวพังหมด (เช่น AI เรียกไม่ได้) หรือติดงบ → นับเป็นรอบไม่สำเร็จ ลองใหม่วันถัดไป (เดือนใหม่งบจะกลับมา)
      const incomplete = stale.length > 0 && (t.failed === stale.length || t.budget > 0);
      await recordRun("auto:stale", triggeredBy, started, incomplete ? "failed" : "ok", text);
    } else {
      summary.push("ข้อมูลเก่า: ยังไม่ถึงรอบสัปดาห์");
    }

    if (await monthlyPassDue()) {
      const started = new Date();
      let created = 0;
      let failed = 0;
      let done = 0;
      let left = 0;
      for (const c of CATEGORIES) {
        // ทำต่อจากรอบที่ค้าง: หมวดที่ทบทวนสำเร็จในรอบเดือนนี้แล้ว (รวมที่คนกดเอง) ไม่ต้องทำซ้ำ
        if (await guideReviewedRecently(c.key)) {
          done++;
          continue;
        }
        // เผื่อเวลาให้จบก่อน time limit ของ Task Scheduler (1 ชม.) หรือเกินงบ AI — ที่เหลือทำวันถัดไป
        if (Date.now() - PROCESS_START > MONTHLY_DEADLINE_MS || (await overBudget())) {
          left++;
          continue;
        }
        const t0 = new Date();
        try {
          const outcome = await checkGuide(c.key, "monthly", "ทบทวนรายเดือน");
          console.log(`  ${outcome.message}`);
          await recordRun(`guide:${c.key}`, "auto:monthly", t0, "ok", outcome.message);
          created += outcome.created;
          done++;
        } catch (err) {
          console.error(`  ❌ ${c.titleTh}: ${errorText(err)}`);
          await recordRun(`guide:${c.key}`, "auto:monthly", t0, "failed", `${c.titleTh}: ${errorText(err)}`);
          failed++;
        }
      }
      const text =
        `คู่มือ: ทบทวนแล้ว ${done}/${CATEGORIES.length} หมวด · สร้างข้อเสนอ ${created}` +
        (failed ? ` · ผิดพลาด ${failed}` : "") +
        (left ? ` · เหลือ ${left} หมวด ทำต่อวันถัดไป (หมดเวลาหรือเกินงบ AI)` : "");
      summary.push(text);
      // ยังไม่ครบทุกหมวด (ผิดพลาดหรือหมดเวลา) → นับเป็นรอบไม่สำเร็จ พรุ่งนี้ทำต่อเฉพาะหมวดที่ค้าง
      await recordRun("auto:monthly", triggeredBy, started, done === CATEGORIES.length ? "ok" : "failed", text);
    } else {
      summary.push("คู่มือ: ยังไม่ถึงรอบเดือน");
    }
    const budget = await overBudget();
    if (budget) summary.push(`${budget} — หยุดการตรวจอัตโนมัติจนถึงเดือนหน้าหรือจนกว่าจะเพิ่มงบ`);
    console.log(summary.join("\n"));
    await finishCheckRun(runId, "ok", summary.join(" · "));
  } catch (err) {
    console.error(`❌ ${errorText(err)}`);
    await finishCheckRun(runId, "failed", [...summary, errorText(err)].join(" · ").slice(0, 2000));
    process.exitCode = 1;
  }
}

async function run(): Promise<void> {
  const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const toolArg = arg("tool");
  const guideArg = arg("guide");
  const triggeredBy = process.env.CONTENT_CHECK_TRIGGER ?? (toolArg === undefined && guideArg === undefined ? "ตั้งเวลา" : "command line");
  if (guideArg !== undefined) {
    const category = getCategory(guideArg);
    if (!category) throw new Error(`ไม่พบหมวด ${guideArg}`);
    return runOne(`guide:${category.key}`, () => checkGuide(category.key, "manual", triggeredBy), triggeredBy);
  }
  if (toolArg === undefined) return runAuto(triggeredBy);
  const toolId = Number(toolArg);
  if (!Number.isInteger(toolId) || toolId <= 0) throw new Error("ระบุเครื่องมือ: --tool=<id>");
  return runOne(`tool:${toolId}`, () => checkTool(toolId, "manual", triggeredBy), triggeredBy);
}

run()
  .catch((err) => {
    console.error(`❌ ${errorText(err)}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
