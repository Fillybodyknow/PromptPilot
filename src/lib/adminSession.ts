import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./auth/session";
import { isStaff } from "./auth/users";

// proxy.ts ส่งคนที่ไม่มี cookie ไปหน้า login แล้ว แต่ cookie อาจหมดอายุ ถูกปลอม หรือผู้ใช้ถูกปิดใช้ไปแล้ว
// ทุกหน้าและทุก server action จึงต้องตรวจกับ DB ซ้ำ — action เป็น POST ที่ยิงตรงได้
// ระดับสิทธิ์: viewer (ผู้อ่าน) อ่านหน้าเว็บได้อย่างเดียว · editor (ผู้ดูแลเนื้อหา) ใช้หน้า admin ได้ทุกหน้า
// ยกเว้นการจัดการผู้ใช้ ซึ่งต้องเป็น admin (ผู้ดูแลระบบ)

/** ชื่อที่บันทึกเป็นผู้แก้ไข (คอลัมน์ updated_by/reviewed_by ยาว 100) */
// บัญชีที่ไม่ใช่พนักงานต่อท้ายว่า "(ภายนอก)" — อีเมลของบัญชีภายนอกเจ้าของตั้งเองได้ จึงไม่ควรดูเหมือนอีเมลพนักงานในบันทึก
const auditName = (u: SessionUser) => (u.accountType === "member" ? u.email : `${u.email} (ภายนอก)`).slice(0, 90);

/** ใช้ใน server action ของงานเนื้อหา — โยน error ถ้าไม่ได้ login หรือเป็นแค่ผู้อ่าน คืนชื่อที่ใช้บันทึกเป็นผู้แก้ไข */
export async function requireAdmin(): Promise<string> {
  const user = await requireSession();
  if (!isStaff(user.role)) throw new Error("Forbidden");
  return auditName(user);
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** ใช้ใน server action ที่จัดการผู้ใช้ — เฉพาะผู้ดูแลระบบ */
export async function requireSystemAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

/** ใช้ในหน้า admin — ส่งไปหน้า login ถ้าไม่ได้ login / session หมดอายุ และส่งผู้อ่านกลับหน้าแรก */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/");
  return user;
}

/** ใช้ในหน้าที่เฉพาะผู้ดูแลระบบ — ผู้ดูแลเนื้อหาถูกส่งกลับหน้าแรกของ admin */
export async function requireSystemAdminPage(): Promise<SessionUser> {
  const user = await requireAdminPage();
  if (user.role !== "admin") redirect("/admin");
  return user;
}
