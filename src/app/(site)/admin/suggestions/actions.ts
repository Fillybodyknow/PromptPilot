"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/adminSession";
import { hasAiKey } from "@/lib/ai/structured";
import { getToolRow } from "@/lib/catalog/admin";
import { withDbErrors } from "@/lib/catalog/dbErrors";
import { getCategory } from "@/lib/categories";
import { acceptGuideSuggestion, acceptPromptSuggestion, acceptToolSuggestion, type ApplyResult } from "@/lib/content/apply";
import { decideSuggestion, getSuggestion, latestCheckRunFor, listCheckRuns, setWatchPages } from "@/lib/content/repo";
import { startGuideCheck, startToolCheck } from "@/lib/content/runCheck";
import { GUIDES_TAG, TOOLS_TAG } from "@/lib/data";

const idOf = (fd: FormData, name = "id") => z.coerce.number().int().positive().parse(fd.get(name));

function done(path?: string) {
  revalidatePath("/admin/suggestions");
  revalidatePath("/admin");
  if (path) revalidatePath(path);
}

/** สั่งตรวจเป็น process แยก แล้วรอสั้นๆ ให้แถว "กำลังตรวจ" ขึ้นก่อน re-render — ใช้ร่วมกันระหว่างตรวจเครื่องมือและคู่มือ */
async function startCheck(scope: string, start: () => void, path: string, eta: string): Promise<FormState> {
  if (!hasAiKey()) return { ok: false, message: "ยังไม่ได้ตั้ง API key ของ AI ในเซิร์ฟเวอร์ (ANTHROPIC_API_KEY หรือ OPENAI_API_KEY)" };
  const [[latest], auto] = await Promise.all([listCheckRuns(1), latestCheckRunFor("auto")]);
  if (latest?.status === "running" || auto?.status === "running") {
    return { ok: false, message: "มีการตรวจอื่นกำลังทำงานอยู่ (อาจเป็นรอบอัตโนมัติประจำวัน) ลองใหม่อีกครั้งในอีกสักครู่" };
  }
  const before = await latestCheckRunFor(scope);
  start();
  let started = false;
  for (let i = 0; i < 20 && !started; i++) {
    await new Promise((r) => setTimeout(r, 250));
    started = ((await latestCheckRunFor(scope))?.id ?? 0) !== (before?.id ?? 0);
  }
  done(path);
  // ไม่มีแถวใหม่ = สคริปต์ข้ามเพราะมีการตรวจอื่นถือ lock อยู่ หรือเริ่มไม่ขึ้น (ดู logs/content-*.log)
  if (!started) return { ok: false, message: "ยังเริ่มตรวจไม่ได้ อาจมีการตรวจอื่นกำลังทำงานอยู่ ลองใหม่อีกครั้งในอีกสักครู่" };
  return { ok: true, message: `เริ่มตรวจแล้ว ใช้เวลาประมาณ ${eta} ผลจะขึ้นในหน้าข้อเสนอแก้ไข` };
}

/** ปุ่ม "ให้ AI ตรวจตัวนี้" ในหน้าแก้ไขเครื่องมือ */
export async function triggerToolCheck(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const toolId = idOf(fd, "toolId");
  if (!(await getToolRow(toolId))) return { ok: false, message: "ไม่พบเครื่องมือนี้" };
  return startCheck(`tool:${toolId}`, () => startToolCheck(toolId, user), `/admin/tools/${toolId}`, "1 นาที");
}

/** ปุ่ม "ให้ AI ทบทวนคู่มือหมวดนี้" ในหน้าแก้คู่มือ */
export async function triggerGuideCheck(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const category = getCategory(String(fd.get("categoryKey") ?? ""));
  if (!category) return { ok: false, message: "ไม่พบหมวดนี้" };
  return startCheck(`guide:${category.key}`, () => startGuideCheck(category.key, user), `/admin/guides/${category.key}`, "1 นาที");
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
    done(`/admin/tools/${toolId}`);
    return { ok: true, message: parsed.data.length ? `บันทึก ${parsed.data.length} หน้าแล้ว` : "ล้างแล้ว รอบหน้าจะใช้ลิงก์หน้าทางการของเครื่องมือ" };
  });
}

/**
 * ใช้ข้อเสนอ — แก้ข้อมูล (เครื่องมือ/คู่มือ): ช่องที่ติ๊ก apply_<field> พร้อมค่า value_<field> (แก้ได้ก่อนกด)
 * prompt ใหม่: ช่อง prompt_<field> ที่คนแก้ได้ (ข้อเสนอเครื่องมือใหม่ไปทางฟอร์มเพิ่มเครื่องมือแทน)
 */
export async function acceptSuggestion(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const id = idOf(fd);
  const s = await getSuggestion(id);
  if (!s) return { ok: false, message: "ไม่พบข้อเสนอนี้" };
  const values = new Map<string, string>();
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("apply_") && v === "on") {
      const field = k.slice("apply_".length);
      values.set(field, String(fd.get(`value_${field}`) ?? ""));
    }
  }
  const promptFields = Object.fromEntries([...fd.entries()].filter(([k]) => k.startsWith("prompt_")).map(([k, v]) => [k.slice("prompt_".length), String(v)]));

  return withDbErrors(async () => {
    let result: ApplyResult;
    if (s.targetType === "tool") result = await acceptToolSuggestion(id, values, user);
    else if (s.targetType === "guide") result = await acceptGuideSuggestion(id, values, user);
    else if (s.targetType === "prompt") result = await acceptPromptSuggestion(id, promptFields, user);
    else return { ok: false, message: "ข้อเสนอเครื่องมือใหม่ใช้ปุ่ม \"สร้างเครื่องมือจากข้อเสนอนี้\"" };
    if (!result.ok) return result;
    if (s.targetType === "tool") {
      updateTag(TOOLS_TAG);
      revalidatePath("/admin/tools");
    } else {
      updateTag(GUIDES_TAG);
      revalidatePath(`/admin/guides/${s.targetKey}`);
    }
    done();
    if (s.targetType === "prompt") return { ok: true, message: "เพิ่ม prompt เป็นร่างแล้ว — ทดสอบแล้วไปแก้สถานะในหน้าคู่มือ" };
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
