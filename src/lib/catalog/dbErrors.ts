import type { FormState } from "@/components/admin/ActionForm";

/**
 * แปลง error จากฐานข้อมูลเป็นข้อความในฟอร์ม แทนการโยนออกไปหน้า error ของ Next (ผู้ใช้จะเสียสิ่งที่พิมพ์ไว้ทั้งหมด)
 * error อื่นที่ไม่ใช่ของ MySQL (รวมถึง redirect ของ Next) โยนต่อตามเดิม
 */
export async function withDbErrors(fn: () => Promise<FormState>): Promise<FormState> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code ?? (err as { code?: string })?.code;
    if (typeof code !== "string" || !code.startsWith("ER_")) throw err;
    if (code === "ER_DUP_ENTRY") return { ok: false, message: "บันทึกไม่ได้: ข้อมูลซ้ำกับรายการที่มีอยู่แล้ว (เช่น slug ซ้ำ) — รีเฟรชหน้าแล้วลองใหม่" };
    if (code === "ER_DATA_TOO_LONG") return { ok: false, message: "บันทึกไม่ได้: มีช่องที่ข้อความยาวเกินกว่าที่ฐานข้อมูลรับได้" };
    console.error("admin write failed", err);
    return { ok: false, message: `บันทึกไม่ได้เพราะฐานข้อมูลแจ้งข้อผิดพลาด (${code}) — ข้อมูลในฟอร์มยังอยู่ ลองใหม่อีกครั้ง` };
  }
}
