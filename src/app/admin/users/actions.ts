"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireSession } from "@/lib/adminSession";
import { checkPasswordPolicy } from "@/lib/auth/password";
import {
  checkUserPassword,
  createUser,
  deactivateOrDeleteUser,
  getUser,
  normalizeUsername,
  setPassword,
  setUserActive,
  USERNAME_RE,
} from "@/lib/auth/users";

const idOf = (fd: FormData) => z.coerce.number().int().positive().parse(fd.get("id"));
const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").slice(0, max);
const done = () => revalidatePath("/admin/users");

/** ตรวจรหัสใหม่ + ช่องยืนยัน คืนข้อความผิดพลาด หรือ null */
function checkNewPassword(fd: FormData, username: string): string | null {
  const password = str(fd, "password");
  if (password !== str(fd, "confirm")) return "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
  return checkPasswordPolicy(password, username);
}

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireSession();
  const username = normalizeUsername(str(fd, "username", 64));
  if (!USERNAME_RE.test(username)) return { ok: false, message: "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–64 ตัว" };
  const problem = checkNewPassword(fd, username);
  if (problem) return { ok: false, message: problem };
  const displayName = str(fd, "displayName", 100).trim() || null;
  const id = await createUser({ username, displayName, password: str(fd, "password"), createdBy: me.username });
  if (id === null) return { ok: false, message: `มีชื่อผู้ใช้ “${username}” อยู่แล้ว` };
  done();
  return { ok: true, message: `เพิ่ม “${username}” แล้ว ส่งรหัสผ่านให้เจ้าของบัญชีทางช่องทางที่ปลอดภัย` };
}

export async function resetUserPassword(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireSession();
  const user = await getUser(idOf(fd));
  if (!user) return { ok: false, message: "ไม่พบผู้ใช้นี้" };
  // รหัสของตัวเองต้องเปลี่ยนผ่านฟอร์มที่ถามรหัสปัจจุบัน — กันคนที่ได้ session ไปเปลี่ยนรหัสเจ้าของบัญชี
  if (user.id === me.userId) return { ok: false, message: "เปลี่ยนรหัสของตัวเองที่ “เปลี่ยนรหัสผ่านของฉัน”" };
  const problem = checkNewPassword(fd, user.username);
  if (problem) return { ok: false, message: problem };
  await setPassword(user.id, str(fd, "password"));
  done();
  return { ok: true, message: `ตั้งรหัสใหม่ให้ “${user.username}” แล้ว (ปลดล็อกและออกจากระบบทุกเครื่องของผู้ใช้นี้)` };
}

export async function changeMyPassword(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireSession();
  if (!(await checkUserPassword(me.userId, str(fd, "current")))) return { ok: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
  const problem = checkNewPassword(fd, me.username);
  if (problem) return { ok: false, message: problem };
  await setPassword(me.userId, str(fd, "password"), me.sessionId);
  return { ok: true, message: "เปลี่ยนรหัสผ่านแล้ว เครื่องอื่นที่ login ไว้จะถูกออกจากระบบ" };
}

export async function toggleUser(fd: FormData): Promise<void> {
  const me = await requireSession();
  const user = await getUser(idOf(fd));
  if (!user || user.id === me.userId) return;
  if (user.isActive) await deactivateOrDeleteUser(user.id, "disable");
  else await setUserActive(user.id, true);
  done();
}

export async function removeUser(fd: FormData): Promise<void> {
  const me = await requireSession();
  const user = await getUser(idOf(fd));
  if (!user || user.id === me.userId) return;
  await deactivateOrDeleteUser(user.id, "delete");
  done();
}
