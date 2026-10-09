import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import path from "node:path";

/**
 * สั่งตรวจเครื่องมือเป็น process แยกแล้วคืนทันที (เปิดหน้าเว็บ + เรียก AI ใช้เวลา 10–60 วินาที นานเกิน timeout ของ reverse proxy)
 * สคริปต์บันทึกผลลงตาราง check_runs เอง และกันรันซ้อนด้วย MySQL lock
 */
export function startToolCheck(toolId: number, triggeredBy: string): void {
  const cwd = process.cwd();
  const logDir = path.join(cwd, "logs");
  mkdirSync(logDir, { recursive: true });
  const log = openSync(path.join(logDir, `content-${new Date().toLocaleDateString("sv-SE")}.log`), "a");
  // เว็บของ Google บางหน้าส่ง header ใหญ่เกินค่าเริ่มต้นของ Node (16 KB) — เปิดไม่ได้ถ้าไม่ขยาย
  const child = spawn(process.execPath, ["--max-http-header-size=65536", "--import", "tsx", "scripts/check-content.ts", `--tool=${toolId}`], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, CONTENT_CHECK_TRIGGER: `manual:${triggeredBy}` },
  });
  child.unref();
}
