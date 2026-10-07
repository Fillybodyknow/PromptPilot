/** ข่าวจาก Google News เก็บชื่อ feed ไว้ใน source — ชื่อสำนักข่าวจริงอยู่ท้ายหัวข้อต้นฉบับ ("… - TechTalkThai") */
export function publisherOf(item: { source: string; title: string }): string {
  if (item.source.includes("Google News")) {
    const m = item.title.match(/ - ([^-]+)$/);
    if (m) return m[1].trim();
  }
  return item.source;
}
