/**
 * ราคา AI ต่อ 1 ล้าน token (USD) — ใช้ประมาณค่าใช้จ่ายในหน้า /admin/ai-usage และงบรายเดือน
 * ตรวจจากหน้าราคาทางการเมื่อ ต.ค. 2026 (platform.claude.com/docs/en/about-claude/pricing,
 * developers.openai.com/api/docs/models/<รุ่น>) — ราคาเปลี่ยนเมื่อไรให้แก้ที่นี่ รุ่นที่ไม่อยู่ในตารางจะแสดงว่า "ไม่ทราบราคา"
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

/** รุ่นที่ระบุ snapshot (เช่น gpt-4.1-mini-2025-04-14) ใช้ราคาของชื่อหลักที่ยาวที่สุดที่ตรงกัน */
export function priceOf(model: string): { input: number; output: number } | null {
  const m = model.toLowerCase();
  const key = Object.keys(PRICES)
    .filter((k) => m === k || m.startsWith(`${k}-`))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : null;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = priceOf(model);
  return p ? (inputTokens * p.input + outputTokens * p.output) / 1_000_000 : null;
}

/** อัตราแลกเปลี่ยนที่ใช้แสดงเป็นบาท (ประมาณ) — ตั้ง AI_USD_THB ได้ */
export function usdToThb(): number {
  const n = Number(process.env.AI_USD_THB);
  return Number.isFinite(n) && n > 0 ? n : 35;
}
