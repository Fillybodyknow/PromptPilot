"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/adminSession";
import { createSource, deleteSource, getSourceRow, setSourceEnabled } from "@/lib/catalog/admin";
import { parseSourceForm } from "@/lib/catalog/forms";
import { fetchSource } from "@/lib/news/feeds";

const idOf = (fd: FormData) => z.coerce.number().int().positive().parse(fd.get("id"));
const done = () => revalidatePath("/admin/sources");

/** ลองดึง feed จริง แล้วสรุปว่าได้กี่ข่าว ข่าวล่าสุดเมื่อไหร่ — ใช้ทั้งตอนทดสอบและก่อนเพิ่มแหล่งใหม่ */
async function probe(src: { name: string; url: string }): Promise<FormState> {
  try {
    const items = await fetchSource(src);
    if (items.length === 0) return { ok: false, message: "ดึงได้แต่ไม่มีข่าวใน feed นี้" };
    const newest = items.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b));
    const when = new Date(newest.publishedAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });
    return { ok: true, message: `ใช้ได้ — ${items.length} ข่าว ล่าสุด ${when}: “${newest.title.slice(0, 80)}”` };
  } catch (err) {
    return { ok: false, message: `ดึง feed ไม่ได้: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function testSource(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const row = await getSourceRow(idOf(fd));
  if (!row) return { ok: false, message: "ไม่พบแหล่งข่าวนี้" };
  return probe(row);
}

export async function addSource(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseSourceForm(fd);
  if (!parsed.ok) return { ok: false, message: "ยังเพิ่มไม่ได้:", errors: parsed.errors };
  // ทดสอบก่อนบันทึก กันใส่ URL ที่ไม่ใช่ RSS แล้วสคริปต์ดึงข่าวต้องเตือนทุกวัน
  const result = await probe(parsed.data);
  if (!result?.ok) return { ok: false, message: `ยังไม่ได้เพิ่ม เพราะ${result?.message}` };
  await createSource(parsed.data.name, parsed.data.url);
  done();
  return { ok: true, message: `เพิ่ม “${parsed.data.name}” แล้ว (${result.message}) จะใช้ในรอบดึงข่าวถัดไป` };
}

export async function toggleSource(fd: FormData) {
  await requireAdmin();
  const row = await getSourceRow(idOf(fd));
  if (!row) return;
  await setSourceEnabled(row.id, !row.enabled);
  done();
}

export async function removeSource(fd: FormData) {
  await requireAdmin();
  await deleteSource(idOf(fd));
  done();
}
