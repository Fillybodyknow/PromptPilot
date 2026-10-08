/**
 * จำกัดจำนวนครั้งที่ลอง login ต่อ IP (เก็บในหน่วยความจำของ process — server มี process เดียวจึงพอ)
 * กันยิงเดารหัสรัวๆ และกันคำขอจำนวนมากไปจองเธรดของ scrypt จนเว็บช้า
 * ล็อกบัญชีใน users.ts กันการเดารหัสของบัญชีเดียว ส่วนนี้กันจากต้นทางเดียวที่ลองหลายบัญชี
 */
const WINDOW_MS = 5 * 60_000;
const MAX_ATTEMPTS = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

/** true = ยังลองได้ (และนับครั้งนี้แล้ว) */
export function takeLoginAttempt(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_ATTEMPTS;
}

/** IP ของผู้ใช้จริง — หลัง IIS/Apache ตัวแอปเห็นแค่ 127.0.0.1 จึงดู X-Forwarded-For ที่ proxy เติมให้ (แอปรับเฉพาะจาก 127.0.0.1 จึงปลอม header นี้จากภายนอกไม่ได้) */
export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",").pop()?.trim() || h.get("x-real-ip") || "local";
}
