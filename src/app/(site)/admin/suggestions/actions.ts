"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/adminSession";
import { hasAiKey } from "@/lib/ai/structured";
import { getToolRow } from "@/lib/catalog/admin";
import { withDbErrors } from "@/lib/catalog/dbErrors";
import { acceptToolSuggestion } from "@/lib/content/apply";
import { decideSuggestion, latestCheckRunFor, listCheckRuns, setWatchPages } from "@/lib/content/repo";
import { startToolCheck } from "@/lib/content/runCheck";
import { TOOLS_TAG } from "@/lib/data";

const idOf = (fd: FormData, name = "id") => z.coerce.number().int().positive().parse(fd.get(name));

function done(toolId?: number) {
  revalidatePath("/admin/suggestions");
  revalidatePath("/admin");
  if (toolId) revalidatePath(`/admin/tools/${toolId}`);
}

/** ปุ่ม "ให้ AI ตรวจตัวนี้" — รันเป็น process แยก แล้วรอสั้นๆ ให้แถว "กำลังตรวจ" ขึ้นก่อน re-render */
export async function triggerToolCheck(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const toolId = idOf(fd, "toolId");
  if (!(await getToolRow(toolId))) return { ok: false, message: "ไม่พบเครื่องมือนี้" };
  if (!hasAiKey()) return { ok: false, message: "ยังไม่ได้ตั้ง API key ของ AI ในเซิร์ฟเวอร์ (ANTHROPIC_API_KEY หรือ OPENAI_API_KEY)" };
  const [[latest], auto] = await Promise.all([listCheckRuns(1), latestCheckRunFor("auto")]);
  if (latest?.status === "running" || auto?.status === "running") {
    return { ok: false, message: "มีการตรวจอื่นกำลังทำงานอยู่ (อาจเป็นรอบอัตโนมัติประจำวัน) ลองใหม่อีกครั้งในอีกสักครู่" };
  }
  const scope = `tool:${toolId}`;
  const before = await latestCheckRunFor(scope);
  startToolCheck(toolId, user);
  let started = false;
  for (let i = 0; i < 20 && !started; i++) {
    await new Promise((r) => setTimeout(r, 250));
    started = ((await latestCheckRunFor(scope))?.id ?? 0) !== (before?.id ?? 0);
  }
  done(toolId);
  // ไม่มีแถวใหม่ = สคริปต์ข้ามเพราะมีการตรวจอื่นถือ lock อยู่ หรือเริ่มไม่ขึ้น (ดู logs/content-*.log)
  if (!started) return { ok: false, message: "ยังเริ่มตรวจไม่ได้ อาจมีการตรวจอื่นกำลังทำงานอยู่ ลองใหม่อีกครั้งในอีกสักครู่" };
  return { ok: true, message: "เริ่มตรวจแล้ว ใช้เวลาประมาณ 1 นาที ผลจะขึ้นในหน้าข้อเสนอแก้ไข" };
}

const urlList = z
  .string()
    // ตัดลิงก์ซ้ำแบบไม่สนตัวพิมพ์เล็กใหญ่ (unique index ของ MySQL เทียบแบบนี้)
  .transform((s) => [...new Map(s.split(/\s+/).filter(Boolean).map((u) => [u.toLowerCase(), u])).values()])
  .pipe(z.array(z.url({ protocol: /^https?$/ }).max(500)).max(5, "ใส่ได้ไม่เกิน 5 หน้า"));

/** หน้าทางการที่ใช้ตรวจเครื่องมือ (หน้าราคา, หน้าโมเดล, changelog) */
export async function saveWatchPages(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const toolId = idOf(fd, "toolId");
  if (!(await getToolRow(toolId))) return { ok: false, message: "ไม่พบเครื่องมือนี้" };
  const parsed = urlList.safeParse(String(fd.get("urls") ?? ""));
  if (!parsed.success) return { ok: false, message: "ลิงก์ไม่ถูกต้อง:", errors: parsed.error.issues.map((i) => i.message) };
  return withDbErrors(async () => {
    await setWatchPages(toolId, parsed.data);
    done(toolId);
    return { ok: true, message: parsed.data.length ? `บันทึก ${parsed.data.length} หน้าแล้ว` : "ล้างแล้ว รอบหน้าจะใช้ลิงก์หน้าทางการของเครื่องมือ" };
  });
}

/** ใช้ข้อเสนอ: ช่องที่ติ๊ก apply_<field> พร้อมค่า value_<field> (แก้ได้ก่อนกด) */
export async function acceptSuggestion(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const id = idOf(fd);
  const values = new Map<string, string>();
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("apply_") && v === "on") {
      const field = k.slice("apply_".length);
      values.set(field, String(fd.get(`value_${field}`) ?? ""));
    }
  }
  return withDbErrors(async () => {
    const result = await acceptToolSuggestion(id, values, user);
    if (!result.ok) return result;
    updateTag(TOOLS_TAG);
    revalidatePath("/admin/tools");
    done();
    return { ok: true, message: result.status === "accepted" ? "ใช้ข้อเสนอแล้ว หน้าเว็บอัปเดตทันที" : `ใช้ ${result.applied} รายการแล้ว หน้าเว็บอัปเดตทันที` };
  });
}

export async function rejectSuggestion(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000) || null;
  if (!(await decideSuggestion(idOf(fd), "rejected", user, note))) return { ok: false, message: "ข้อเสนอนี้ถูกตัดสินไปแล้ว" };
  done();
  return { ok: true, message: "ปฏิเสธแล้ว" };
}
