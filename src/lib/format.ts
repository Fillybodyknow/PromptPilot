const TZ = "Asia/Bangkok";

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** "วันนี้ 07:16 น." / "เมื่อวาน 23:00 น." / "5 ต.ค. 2569" */
export function formatNewsTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  if (dayKey(d) === dayKey(now)) return `วันนี้ ${time} น.`;
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return `เมื่อวาน ${time} น.`;
  return d.toLocaleDateString("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

/** หัวกลุ่มวันในรายการข่าว: "วันนี้ · พุธ 7 ต.ค. 2569" */
export function formatDayHeading(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const full = d.toLocaleDateString("th-TH", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (dayKey(d) === dayKey(now)) return `วันนี้ · ${full}`;
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return `เมื่อวาน · ${full}`;
  return full;
}

export const bangkokDayKey = (iso: string) => dayKey(new Date(iso));

/** "วันพุธที่ 7 ตุลาคม 2569" */
export function formatLongDate(d = new Date()): string {
  return d.toLocaleDateString("th-TH", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** วันที่แบบ YYYY-MM-DD (เช่น verifiedAt) → "28 ส.ค. 2569" */
export function formatIsoDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("th-TH", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
