/** ไปได้เฉพาะหน้าใน /admin — กันลิงก์ login ที่แนบ ?next= ไปเว็บอื่น (open redirect) */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/|\?|$)/.test(next) && !next.includes("//") ? next : "/admin";
}
