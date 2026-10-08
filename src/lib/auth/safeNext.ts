/**
 * ปลายทางหลัง login — ต้องเป็น path ภายในเว็บนี้เท่านั้น กันลิงก์ login ที่แนบ ?next= ไปเว็บอื่น (open redirect)
 * ไม่รับ //host, /\host (browser ตีความเป็นเว็บอื่นได้), ช่องว่าง/ขึ้นบรรทัด และหน้า login/auth เอง (กันวนซ้ำ)
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(next)) return "/";
  if (/^\/(login|auth)(\/|\?|$)/.test(next)) return "/";
  return next;
}
