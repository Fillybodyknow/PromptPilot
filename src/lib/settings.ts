import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { appSettings } from "@/db/schema";

const AUTO_APPROVE_NEWS = "news.auto_approve";

/** ผู้อนุมัติที่บันทึกไว้กับข่าวที่ระบบอนุมัติให้เอง (แสดงในหน้า admin ว่า "ตรวจโดย …") */
export const AUTO_APPROVER = "อนุมัติอัตโนมัติ";

export interface AutoApproveSetting {
  enabled: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/** อนุมัติข่าวอัตโนมัติเปิดอยู่ไหม — ค่าเริ่มต้นปิด (ทุกข่าวต้องมีคนตรวจ) */
export async function getAutoApproveNews(): Promise<AutoApproveSetting> {
  const [row] = await getDb().select().from(appSettings).where(eq(appSettings.key, AUTO_APPROVE_NEWS));
  return { enabled: row?.value === "1", updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null };
}

export async function setAutoApproveNews(enabled: boolean, by: string): Promise<void> {
  const now = new Date();
  await getDb()
    .insert(appSettings)
    .values({ key: AUTO_APPROVE_NEWS, value: enabled ? "1" : "0", updatedAt: now, updatedBy: by })
    .onDuplicateKeyUpdate({ set: { value: enabled ? "1" : "0", updatedAt: now, updatedBy: by } });
}
