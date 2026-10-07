/** searchParams ทุกตัวอาจเป็น string[] ได้ถ้า key ซ้ำใน URL (?q=a&q=b) — เอาค่าแรกเสมอ */
export type SearchParams = Record<string, string | string[] | undefined>;

export const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** เลขหน้าที่ปลอดภัย: 1..max (กัน offset ใหญ่จน SQL พัง) */
export function pageParam(v: string | string[] | undefined, max = 500): number {
  const n = Number.parseInt(one(v) ?? "1", 10);
  return Number.isFinite(n) ? Math.min(Math.max(1, n), max) : 1;
}
