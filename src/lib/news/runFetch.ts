import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import path from "node:path";

/**
 * สั่งรัน scripts/fetch-news.ts เป็น process แยกแล้วคืนทันที (รอบหนึ่งใช้ ~1–2 นาที นานเกิน timeout ของ reverse proxy)
 * สคริปต์บันทึกสถานะ/ผลลัพธ์ลงตาราง fetch_runs เอง และกันรันซ้อนด้วย beginRun
 */
export function startFetchProcess(triggeredBy: string): void {
  const cwd = process.cwd();
  const logDir = path.join(cwd, "logs");
  mkdirSync(logDir, { recursive: true });
  const log = openSync(path.join(logDir, `news-${new Date().toLocaleDateString("sv-SE")}.log`), "a");
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/fetch-news.ts"], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, NEWS_FETCH_TRIGGER: `manual:${triggeredBy}` },
  });
  child.unref();
}
