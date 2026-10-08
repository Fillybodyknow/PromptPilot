import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./auth/session";

// proxy.ts ส่งคนที่ไม่มี cookie ไปหน้า login แล้ว แต่ cookie อาจหมดอายุหรือถูกปลอม
// ทุกหน้าและทุก server action จึงต้องตรวจกับ DB ซ้ำ — action เป็น POST ที่ยิงตรงได้

/** ใช้ใน server action — โยน error ถ้าไม่ได้ login คืนชื่อผู้ใช้ (บันทึกเป็นผู้แก้ไข) */
export async function requireAdmin(): Promise<string> {
  return (await requireSession()).username;
}

/** เหมือน requireAdmin แต่คืนข้อมูล session ทั้งหมด (ใช้ในการจัดการผู้ใช้ เช่นกันลบตัวเอง) */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** ใช้ในหน้า admin — ส่งไปหน้า login ถ้าไม่ได้ login หรือ session หมดอายุ */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
