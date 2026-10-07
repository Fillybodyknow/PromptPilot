import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_REALM = 'Basic realm="PromptPilot Admin", charset="UTF-8"';

// เทียบผ่าน sha256 ก่อน เพื่อให้ timingSafeEqual ได้ buffer ยาวเท่ากันเสมอ
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** ตรวจ header Authorization แบบ Basic — คืนชื่อผู้ใช้ถ้าผ่าน, null ถ้าไม่ผ่าน (ไม่ได้ตั้ง env = ปฏิเสธทุกคน) */
export function checkBasicAuth(header: string | null): string | null {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass || !header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  const okUser = safeEqual(decoded.slice(0, sep), user);
  const okPass = safeEqual(decoded.slice(sep + 1), pass);
  return okUser && okPass ? user : null;
}
