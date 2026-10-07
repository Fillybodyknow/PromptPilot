"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkBasicAuth } from "@/lib/adminAuth";
import { isCategoryKey } from "@/lib/news/schema";
import { latestRun, setStatus, updateContent } from "@/lib/news/repo";
import { startFetchProcess } from "@/lib/news/runFetch";

// proxy.ts กันหน้า /admin ไว้แล้ว แต่ server action เป็น POST ที่ยิงตรงได้ จึงต้องตรวจซ้ำทุกครั้ง
async function requireAdmin(): Promise<string> {
  const user = checkBasicAuth((await headers()).get("authorization"));
  if (!user) throw new Error("Unauthorized");
  return user;
}

const idSchema = z.string().regex(/^[0-9a-f]{16}$/);

function readId(formData: FormData): string {
  return idSchema.parse(formData.get("id"));
}

function done() {
  revalidatePath("/admin/news");
}

export async function approveNews(formData: FormData) {
  const user = await requireAdmin();
  if (!setStatus(readId(formData), "approved", user)) {
    throw new Error("อนุมัติไม่ได้: ไม่พบข่าว หรือข่าวยังไม่มีหัวข้อ/คำสรุปภาษาไทย");
  }
  done();
}

export async function rejectNews(formData: FormData) {
  const user = await requireAdmin();
  setStatus(readId(formData), "rejected", user);
  done();
}

/** ย้ายกลับไปรออนุมัติ: ถอนการอนุมัติ หรือดึงข่าวที่ถูกปฏิเสธ/AI คัดออกกลับมา */
export async function moveToPending(formData: FormData) {
  const user = await requireAdmin();
  setStatus(readId(formData), "pending", user);
  done();
}

const editSchema = z.object({
  titleTh: z.string().trim().min(1).max(200),
  summaryTh: z.string().trim().min(1).max(1000),
  categories: z.array(z.string()).transform((keys) => keys.filter(isCategoryKey).slice(0, 3)),
  importance: z.coerce.number().int().min(1).max(3),
});

export async function triggerFetch() {
  const user = await requireAdmin();
  const before = latestRun();
  if (before?.status === "running") return done();
  startFetchProcess(user);
  // รอให้สคริปต์บันทึกแถว running ก่อน re-render เพื่อให้หน้าแสดงสถานะ "กำลังดึง" ทันที
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if ((latestRun()?.id ?? 0) !== (before?.id ?? 0)) break;
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
  });
  if (!updateContent(id, edit)) throw new Error("ไม่พบข่าวนี้");
  setStatus(id, "approved", user);
  done();
}
