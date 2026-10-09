import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import path from "node:path";

/**
 * สั่งตรวจเป็น process แยกแล้วคืนทันที (เปิดหน้าเว็บ + เรียก AI ใช้เวลา 10–60 วินาที นานเกิน timeout ของ reverse proxy)
 * สคริปต์บันทึกผลลงตาราง check_runs เอง และกันรันซ้อนด้วย MySQL lock
 */
function startCheck(arg: string, triggeredBy: string): void {
  const cwd = process.cwd();
  const logDir = path.join(cwd, "logs");
  mkdirSync(logDir, { recursive: true });
  const log = openSync(path.join(logDir, `content-${new Date().toLocaleDateString("sv-SE")}.log`), "a");
  // เว็บของ Google บางหน้าส่ง header ใหญ่เกินค่าเริ่มต้นของ Node (16 KB) — เปิดไม่ได้ถ้าไม่ขยาย
  const child = spawn(process.execPath, ["--max-http-header-size=65536", "--import", "tsx", "scripts/check-content.ts", arg], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, CONTENT_CHECK_TRIGGER: `manual:${triggeredBy}` },
  });
  child.unref();
}

export const startToolCheck = (toolId: number, triggeredBy: string) => startCheck(`--tool=${toolId}`, triggeredBy);
/** categoryKey ต้องผ่าน getCategory มาแล้ว (ส่งเป็นอาร์กิวเมนต์ของ process ไม่ผ่าน shell) */
export const startGuideCheck = (categoryKey: string, triggeredBy: string) => startCheck(`--guide=${categoryKey}`, triggeredBy);
