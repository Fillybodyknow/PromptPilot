"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/adminSession";
import { createTool, deleteTool, getToolRow, moveTool, updateTool } from "@/lib/catalog/admin";
import { withDbErrors } from "@/lib/catalog/dbErrors";
import { parseToolForm } from "@/lib/catalog/forms";
import { getCategory } from "@/lib/categories";
import { markNewToolCreated } from "@/lib/content/apply";
import { TOOLS_TAG } from "@/lib/data";

const idOf = (fd: FormData) => z.coerce.number().int().positive().parse(fd.get("id"));

function done() {
  revalidatePath("/admin/tools");
  // หน้าเว็บสาธารณะต้องเห็นข้อมูลใหม่ทันที
  updateTag(TOOLS_TAG);
}

export async function saveTool(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  // เลขแถวใช้ชื่อ rowId — ชื่อ "id" เป็นของช่อง slug ในฟอร์ม (ตรงกับ entry.id ใน schema)
  const id = fd.get("rowId") ? z.coerce.number().int().positive().parse(fd.get("rowId")) : null;
  const categoryKey = id ? (await getToolRow(id))?.categoryKey : String(fd.get("categoryKey") ?? "");
  const category = categoryKey ? getCategory(categoryKey) : undefined;
  if (!category) return { ok: false, message: "ไม่พบเครื่องมือหรือหมวดนี้" };

  const parsed = parseToolForm(fd, category);
  if (!parsed.ok) return { ok: false, message: "ยังบันทึกไม่ได้ ข้อมูลไม่ครบหรือผิดรูปแบบ:", errors: parsed.errors };
  const featured = fd.get("featured") === "on";

  const slugTaken: FormState = { ok: false, message: `รหัส (slug) "${parsed.data.id}" ซ้ำกับเครื่องมืออื่นในหมวดนี้` };

  if (id) {
    return withDbErrors(async () => {
      if (!(await updateTool(id, parsed.data, featured, user))) return slugTaken;
      done();
      return { ok: true, message: "บันทึกแล้ว หน้าเว็บอัปเดตทันที" };
    });
  }
  let newId: number | null = null;
  const result = await withDbErrors(async () => {
    newId = await createTool(category.key, parsed.data, featured, user);
    return newId ? null : slugTaken;
  });
  if (!newId) return result;
  // สร้างจากข้อเสนอเครื่องมือใหม่ของ AI → ปิดข้อเสนอนั้น
  const fromSuggestion = Number(fd.get("fromSuggestion"));
  if (Number.isInteger(fromSuggestion) && fromSuggestion > 0) {
    try {
      await markNewToolCreated(fromSuggestion, category.key, newId, user);
      revalidatePath("/admin/suggestions");
    } catch (err) {
      // เครื่องมือบันทึกแล้ว — ข้อเสนอที่ยังค้างหมดอายุเองใน 30 วัน หรือกดปฏิเสธได้
      console.error("close new-tool suggestion failed", err);
    }
  }
  done();
  redirect(`/admin/tools/${newId}?created=1`);
}

export async function removeTool(fd: FormData) {
  await requireAdmin();
  const row = await getToolRow(idOf(fd));
  if (!row) return;
  await deleteTool(row.id);
  done();
  redirect(`/admin/tools?category=${row.categoryKey}`);
}

export async function moveToolUp(fd: FormData) {
  await requireAdmin();
  await moveTool(idOf(fd), "up");
  done();
}

export async function moveToolDown(fd: FormData) {
  await requireAdmin();
  await moveTool(idOf(fd), "down");
  done();
}
