import { AUTO_APPROVER } from "../settings";
import type { NewItem } from "./repo";

/**
 * อนุมัติอัตโนมัติ: เปลี่ยนข่าวที่ AI คัดว่าเกี่ยวข้อง (สถานะ pending = ไม่ซ้ำและไม่ถูกคัดออก)
 * และมีหัวข้อ + คำสรุปภาษาไทยครบ เป็น approved — เงื่อนไขเดียวกับปุ่มอนุมัติในหน้า admin
 * คืนจำนวนข่าวที่อนุมัติให้
 */
export function applyAutoApprove(rows: NewItem[], enabled: boolean, at: string): number {
  if (!enabled) return 0;
  let n = 0;
  for (const r of rows) {
    if (r.status !== "pending" || !r.titleTh?.trim() || !r.summaryTh?.trim()) continue;
    r.status = "approved";
    r.reviewedBy = AUTO_APPROVER;
    r.reviewedAt = at;
    n++;
  }
  return n;
}
