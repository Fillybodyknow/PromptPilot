"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/adminSession";
import { createPrompt, deletePrompt, movePrompt, saveGuide, updatePrompt } from "@/lib/catalog/admin";
import { withDbErrors } from "@/lib/catalog/dbErrors";
import { parseGuideForm, parsePromptForm } from "@/lib/catalog/forms";
import { getCategory } from "@/lib/categories";
import { GUIDES_TAG } from "@/lib/data";

const idOf = (fd: FormData) => z.coerce.number().int().positive().parse(fd.get("id"));

function categoryOf(fd: FormData) {
  return getCategory(String(fd.get("categoryKey") ?? ""));
}

function done(categoryKey: string) {
  revalidatePath(`/admin/guides/${categoryKey}`);
  updateTag(GUIDES_TAG);
}

const invalid = (errors: string[]): FormState => ({ ok: false, message: "ยังบันทึกไม่ได้ ข้อมูลไม่ครบหรือผิดรูปแบบ:", errors });

export async function saveGuideAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const category = categoryOf(fd);
  if (!category) return { ok: false, message: "ไม่พบหมวดนี้" };
  const parsed = parseGuideForm(fd);
  if (!parsed.ok) return invalid(parsed.errors);
  return withDbErrors(async () => {
    await saveGuide(category.key, parsed.data, user);
    done(category.key);
    return { ok: true, message: "บันทึกคู่มือแล้ว หน้าเว็บอัปเดตทันที" };
  });
}

export async function savePromptAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const category = categoryOf(fd);
  if (!category) return { ok: false, message: "ไม่พบหมวดนี้" };
  const parsed = parsePromptForm(fd);
  if (!parsed.ok) return invalid(parsed.errors);
  return withDbErrors(async () => {
    if (fd.get("id")) {
      if (!(await updatePrompt(idOf(fd), category.key, parsed.data))) {
        return { ok: false, message: "ไม่พบ prompt นี้แล้ว (อาจถูกลบจากอีกหน้าต่าง) — รีเฟรชหน้าก่อนแก้ต่อ" };
      }
    } else if (!(await createPrompt(category.key, parsed.data))) {
      return { ok: false, message: "หมวดนี้ยังไม่มีคู่มือ ให้บันทึกคู่มือด้านบนก่อนเพิ่ม prompt" };
    }
    done(category.key);
    return { ok: true, message: fd.get("id") ? "บันทึก prompt แล้ว" : "เพิ่ม prompt แล้ว" };
  });
}

export async function deletePromptAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const category = categoryOf(fd);
  if (!category) return { ok: false, message: "ไม่พบหมวดนี้" };
  const result = await deletePrompt(idOf(fd), category.key);
  if (result === "last") return { ok: false, message: "ลบไม่ได้: คู่มือต้องมี prompt อย่างน้อย 1 ตัว ให้เพิ่มตัวใหม่ก่อนแล้วค่อยลบตัวนี้" };
  if (result === "missing") return { ok: false, message: "ไม่พบ prompt นี้แล้ว — รีเฟรชหน้า" };
  done(category.key);
  return { ok: true, message: "ลบแล้ว" };
}

export async function movePromptUp(fd: FormData) {
  await requireAdmin();
  await movePrompt(idOf(fd), "up");
  const c = categoryOf(fd);
  if (c) done(c.key);
}

export async function movePromptDown(fd: FormData) {
  await requireAdmin();
  await movePrompt(idOf(fd), "down");
  const c = categoryOf(fd);
  if (c) done(c.key);
}
