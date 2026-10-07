import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { checkBasicAuth } from "./adminAuth";

// proxy.ts กัน /admin ไว้แล้ว แต่ทุกหน้าและทุก server action ต้องตรวจซ้ำ — action เป็น POST ที่ยิงตรงได้

/** ใช้ใน server action — โยน error ถ้าไม่ได้ login */
export async function requireAdmin(): Promise<string> {
  const user = checkBasicAuth((await headers()).get("authorization"));
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** ใช้ในหน้า admin — ตอบ 404 ถ้าไม่ได้ login (กรณี matcher ของ proxy ถูกแก้จนหลุด) */
export async function requireAdminPage(): Promise<string> {
  const user = checkBasicAuth((await headers()).get("authorization"));
  if (!user) notFound();
  return user;
}
