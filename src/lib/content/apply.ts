import { getToolRow, updateTool, type ToolRow } from "@/lib/catalog/admin";
import { precheck } from "@/lib/catalog/forms";
import { toolRowToEntry } from "@/lib/catalog/repo";
import { getCategory } from "@/lib/categories";
import { decideSuggestion, getSuggestion, reopenSuggestion } from "./repo";
import { FIELD_LABEL, todayBangkok, toFieldValue, TOOL_FIELDS } from "./toolCheck";

export type ApplyResult = { ok: true; status: "accepted" | "partial"; applied: number } | { ok: false; message: string; errors?: string[] };

/** ข้อมูลเครื่องมือหลังใส่ค่าที่เลือก — ตรวจทั้งขนาดคอลัมน์/ลิงก์ http(s) (กฎเดียวกับฟอร์ม) และ schema ของหมวด */
function buildEntry(row: ToolRow, values: Map<string, string>, selected: string[]): { ok: true; entry: Record<string, unknown> } | { ok: false; errors: string[] } {
  const category = getCategory(row.categoryKey);
  if (!category) return { ok: false, errors: ["ไม่พบหมวดของเครื่องมือนี้"] };
  const entry = toolRowToEntry(row);
  const errors: string[] = [];
  for (const field of selected) {
    if (!(TOOL_FIELDS as readonly string[]).includes(field)) continue; // verifiedAt ตั้งเองด้านล่าง
    try {
      entry[field] = toFieldValue(field, values.get(field) ?? "");
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (errors.length) return { ok: false, errors };
  entry.verifiedAt = todayBangkok();
  // ช่อง warning ที่ล้างค่า: schema รับ null แต่หน้าเว็บอ่านแบบไม่มีช่อง — ตัดออกให้เหมือนข้อมูลที่บันทึกจากฟอร์ม
  if (entry.warning === null) delete entry.warning;

  const pre = precheck(Object.fromEntries(selected.map((f) => [f, entry[f]])), FIELD_LABEL);
  if (pre.length) return { ok: false, errors: pre };
  const parsed = category.schema.safeParse(entry);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  return { ok: true, entry: parsed.data as Record<string, unknown> };
}

/**
 * นำข้อเสนอที่คนเลือกไปแก้ข้อมูลเครื่องมือจริง
 * values = ช่องที่ติ๊กเลือก → ค่า (ข้อความจากฟอร์ม ซึ่งคนอาจแก้จากที่ AI เสนอแล้ว)
 * การยอมรับถือว่าคนตรวจแล้ว จึงตั้งวันที่ตรวจล่าสุดเป็นวันนี้เสมอ
 */
export async function acceptToolSuggestion(id: number, values: Map<string, string>, user: string): Promise<ApplyResult> {
  const s = await getSuggestion(id);
  if (!s || s.targetType !== "tool") return { ok: false, message: "ไม่พบข้อเสนอนี้" };
  if (s.status !== "pending") return { ok: false, message: "ข้อเสนอนี้ถูกตัดสินไปแล้ว" };
  const toolId = Number(s.targetKey);
  const row = await getToolRow(toolId);
  if (!row) return { ok: false, message: "ไม่พบเครื่องมือของข้อเสนอนี้ (อาจถูกลบไปแล้ว) — กดปฏิเสธเพื่อปิดข้อเสนอ" };

  const offered = new Set(s.changes.map((c) => c.field));
  const selected = [...values.keys()].filter((f) => offered.has(f));
  if (selected.length === 0) return { ok: false, message: "ยังไม่ได้เลือกรายการที่จะใช้ ถ้าไม่ใช้เลยให้กดปฏิเสธ" };
  const check = buildEntry(row, values, selected);
  if (!check.ok) return { ok: false, message: "ค่าที่แก้ยังไม่ถูกรูปแบบ:", errors: check.errors };

  // จองสถานะก่อนแก้ — สองคนกดพร้อมกันจะมีคนเดียวที่ผ่าน ถ้าบันทึกเครื่องมือไม่สำเร็จ คืนสถานะเป็นรอตรวจ
  const status = selected.length === offered.size ? "accepted" : "partial";
  if (!(await decideSuggestion(id, status, user, null))) return { ok: false, message: "ข้อเสนอนี้ถูกตัดสินไปแล้ว" };
  try {
    // อ่านแถวใหม่หลังจอง — ไม่เขียนทับสิ่งที่มีคนเพิ่งบันทึกจากฟอร์มแก้ไขเครื่องมือ
    const fresh = await getToolRow(toolId);
    const final = fresh ? buildEntry(fresh, values, selected) : null;
    if (!fresh || !final?.ok || !(await updateTool(toolId, final.entry, fresh.featured, user))) {
      await reopenSuggestion(id);
      return { ok: false, message: "บันทึกไม่สำเร็จ ข้อมูลเครื่องมือเพิ่งถูกแก้หรือลบ — รีเฟรชหน้าแล้วลองใหม่", errors: final && !final.ok ? final.errors : undefined };
    }
  } catch (err) {
    await reopenSuggestion(id);
    throw err;
  }
  return { ok: true, status, applied: selected.length };
}
