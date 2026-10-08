/**
 * ให้ AI ตรวจข้อมูลเครื่องมือกับหน้าทางการของผู้ให้บริการ แล้วสร้าง "ข้อเสนอแก้ไข" ให้คนอนุมัติในหน้า /admin/suggestions
 * รัน: npx tsx scripts/check-content.ts --tool=<id>     (ปุ่ม "ให้ AI ตรวจตัวนี้" ในหน้า admin สั่งให้)
 * env: เหมือนการดึงข่าว (ANTHROPIC_API_KEY / OPENAI_API_KEY), CONTENT_CHECK_TRIGGER = ใครสั่ง
 */
import { closeDb } from "../src/db/client";
import { beginCheckRun, finishCheckRun } from "../src/lib/content/repo";
import { checkTool } from "../src/lib/content/toolCheck";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

async function run(): Promise<void> {
  const toolArg = process.argv.find((a) => a.startsWith("--tool="))?.slice("--tool=".length);
  const toolId = Number(toolArg);
  if (!Number.isInteger(toolId) || toolId <= 0) throw new Error("ระบุเครื่องมือ: --tool=<id>");
  const triggeredBy = process.env.CONTENT_CHECK_TRIGGER ?? "command line";
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${msg}`);
    await finishCheckRun(runId, "failed", msg.slice(0, 2000));
    process.exitCode = 1;
  }
}

run()
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
