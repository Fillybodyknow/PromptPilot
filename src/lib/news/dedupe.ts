interface DedupeInput {
  id: string;
  relevant: boolean;
  /** ค่าที่ AI ตอบมา ("" = ไม่ซ้ำ) */
  duplicateOf: string;
}

/**
 * ตัดสินว่าข่าวไหนเป็นข่าวซ้ำของข่าวหลักตัวไหน — คืน id → id ข่าวหลัก (null = เป็นข่าวหลักเอง)
 * - ยอมรับเฉพาะเป้าหมายที่มีอยู่จริง: ข่าวที่ยังมีผลใน DB (knownIds) หรือข่าวที่ relevant ในรอบเดียวกัน
 * - ตามต่อจนถึงข่าวหลักจริง (A ซ้ำ B, B ซ้ำ C → A ซ้ำ C) และตัดวงวน (A ซ้ำ B, B ซ้ำ A → B เป็นข่าวหลัก)
 */
export function resolveDuplicates(items: DedupeInput[], knownIds: Set<string>): Map<string, string | null> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const memo = new Map<string, string | null>();

  const canonicalOf = (id: string, visiting: Set<string>): string | null => {
    if (memo.has(id)) return memo.get(id)!;
    const item = byId.get(id)!;
    const target = item.relevant ? item.duplicateOf.trim() : "";
    let result: string | null = null;
    if (target && target !== id) {
      if (knownIds.has(target)) {
        result = target;
      } else if (byId.get(target)?.relevant && !visiting.has(target)) {
        visiting.add(id);
        result = canonicalOf(target, visiting) ?? target;
      }
    }
    memo.set(id, result);
    return result;
  };

  for (const item of items) canonicalOf(item.id, new Set());
  return memo;
}
