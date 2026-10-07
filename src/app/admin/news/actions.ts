"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminSession";
import { NEWS_TAG } from "@/lib/news/public";
import { isCategoryKey } from "@/lib/news/schema";
import { confirmDuplicate, latestRun, separateDuplicate, setStatus, updateContent } from "@/lib/news/repo";
import { startFetchProcess } from "@/lib/news/runFetch";

const idSchema = z.string().regex(/^[0-9a-f]{16}$/);

function readId(formData: FormData): string {
  return idSchema.parse(formData.get("id"));
}

function done() {
  revalidatePath("/admin/news");
  // หน้าสาธารณะต้องเห็นการเปลี่ยนแปลงทันที ไม่ใช่รอ cache หมดอายุ
  updateTag(NEWS_TAG);
}

export async function approveNews(formData: FormData) {
  const user = await requireAdmin();
  if (!(await setStatus(readId(formData), "approved", user))) {
    throw new Error("อนุมัติไม่ได้: ไม่พบข่าว หรือข่าวยังไม่มีหัวข้อ/คำสรุปภาษาไทย");
  }
  done();
}

export async function rejectNews(formData: FormData) {
  const user = await requireAdmin();
  await setStatus(readId(formData), "rejected", user);
  done();
}

/** ย้ายกลับไปรออนุมัติ: ถอนการอนุมัติ หรือดึงข่าวที่ถูกปฏิเสธ/AI คัดออกกลับมา */
export async function moveToPending(formData: FormData) {
  const user = await requireAdmin();
  await setStatus(readId(formData), "pending", user);
  done();
}

/** ยืนยันว่าข่าวซ้ำเป็นเรื่องเดียวกับข่าวหลักจริง — จึงจะแสดงเป็น "แหล่งอื่นที่รายงานเรื่องนี้" บนหน้าเว็บ */
export async function confirmDuplicateStory(formData: FormData) {
  const user = await requireAdmin();
  await confirmDuplicate(readId(formData), user);
  done();
}

/** แยกข่าวที่ AI ผูกเป็นข่าวซ้ำผิด ออกมาเป็นข่าวใหม่ที่รออนุมัติ */
export async function separateFromStory(formData: FormData) {
  const user = await requireAdmin();
  await separateDuplicate(readId(formData), user);
  done();
}

const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((s) => (s === "" ? null : s));

const editSchema = z.object({
  titleTh: z.string().trim().min(1).max(200),
  summaryTh: z.string().trim().min(1).max(1000),
  categories: z.array(z.string()).transform((keys) => keys.filter(isCategoryKey).slice(0, 3)),
  importance: z.coerce.number().int().min(1).max(3),
  aiReason: optionalText,
  roleEmployee: optionalText,
  roleIt: optionalText,
  roleExec: optionalText,
});

export async function triggerFetch() {
  const user = await requireAdmin();
  const before = await latestRun();
  if (before?.status === "running") return done();
  startFetchProcess(user);
  // รอให้สคริปต์บันทึกแถว running ก่อน re-render เพื่อให้หน้าแสดงสถานะ "กำลังดึง" ทันที
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (((await latestRun())?.id ?? 0) !== (before?.id ?? 0)) break;
  }
  done();
}

export async function saveAndApprove(formData: FormData) {
  const user = await requireAdmin();
  const id = readId(formData);
  const edit = editSchema.parse({
    titleTh: formData.get("titleTh"),
    summaryTh: formData.get("summaryTh"),
    categories: formData.getAll("categories"),
    importance: formData.get("importance"),
    aiReason: formData.get("aiReason") ?? "",
    roleEmployee: formData.get("roleEmployee") ?? "",
    roleIt: formData.get("roleIt") ?? "",
    roleExec: formData.get("roleExec") ?? "",
  });
  if (!(await updateContent(id, edit))) throw new Error("ไม่พบข่าวนี้");
  await setStatus(id, "approved", user);
  done();
}
