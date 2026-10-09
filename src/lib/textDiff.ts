/**
 * เทียบข้อความ 2 ชุดทีละคำ (ตัดคำภาษาไทยด้วย Intl.Segmenter) — ใช้แสดงว่าข้อเสนอของ AI เปลี่ยนตรงไหน
 * ในข้อความยาว (คู่มือ, สรุป, หมายเหตุราคา) แทนการให้คนอ่านเทียบสองย่อหน้าเอง
 */
export interface DiffPart {
  kind: "same" | "add" | "del";
  text: string;
}

const segmenter = new Intl.Segmenter("th", { granularity: "word" });
const words = (s: string) => [...segmenter.segment(s)].map((x) => x.segment);

/** ยาวเกินนี้ (คำ × คำ) ไม่เทียบละเอียด — กันหน้าใช้หน่วยความจำ/เวลามากเกิน */
const MAX_CELLS = 4_000_000;

export function diffWords(before: string, after: string): DiffPart[] {
  const a = words(before);
  const b = words(after);
  if (a.length * b.length > MAX_CELLS) {
    return [
      { kind: "del", text: before },
      { kind: "add", text: after },
    ];
  }
  // LCS แบบตาราง (ข้อความในระบบยาวไม่เกินหลักพันคำ)
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last?.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", a[i++]);
    else push("add", b[j++]);
  }
  while (i < n) push("del", a[i++]);
  while (j < m) push("add", b[j++]);
  return out;
}
