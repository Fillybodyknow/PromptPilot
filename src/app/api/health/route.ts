import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db/client";

/**
 * ตรวจว่าเว็บและฐานข้อมูลทำงาน — ใช้โดย scripts/install.ps1 และ update.ps1 (ไม่ต้อง login, ไม่คืนข้อมูลภายใน)
 * หน้าแรกต้อง login แล้ว จึงใช้ทดสอบว่าเว็บพร้อมไม่ได้ (redirect ไปหน้า login ที่ไม่แตะฐานข้อมูล)
 */
export async function GET() {
  await connection();
  try {
    await getDb().execute(sql`SELECT 1`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "database" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
