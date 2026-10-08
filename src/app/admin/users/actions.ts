"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/ActionForm";
import { requireSystemAdmin } from "@/lib/adminSession";
import { changeUser, getUser, ROLE_LABEL, type UserRole } from "@/lib/auth/users";

// ทุก action ในไฟล์นี้เฉพาะผู้ดูแลระบบ และห้ามเปลี่ยนสิทธิ์/สถานะของตัวเอง (กันเผลอตัดสิทธิ์ตัวเองออก)

const idOf = (fd: FormData) => z.coerce.number().int().positive().parse(fd.get("id"));
const roleOf = (fd: FormData): UserRole => z.enum(["admin", "editor"]).parse(fd.get("role"));
const done = () => {
  revalidatePath("/admin/users");
  revalidatePath("/admin", "layout");
};

async function target(fd: FormData) {
  const me = await requireSystemAdmin();
  const user = await getUser(idOf(fd));
  if (!user) return { me, user: null, error: "ไม่พบผู้ใช้นี้" };
  if (user.id === me.userId) return { me, user: null, error: "เปลี่ยนสิทธิ์หรือสถานะของตัวเองไม่ได้ ให้ผู้ดูแลระบบคนอื่นทำ" };
  return { me, user, error: null };
}

export async function approveUser(_: FormState, fd: FormData): Promise<FormState> {
  const { me, user, error } = await target(fd);
  if (!user) return { ok: false, message: error };
  const role = roleOf(fd);
  const res = await changeUser(user.id, { status: "active", role }, me.email);
  if (!res.ok) return res;
  done();
  return { ok: true, message: `อนุมัติ ${user.email} เป็น${ROLE_LABEL[role]}แล้ว` };
}

export async function setRole(_: FormState, fd: FormData): Promise<FormState> {
  const { me, user, error } = await target(fd);
  if (!user) return { ok: false, message: error };
  const role = roleOf(fd);
  const res = await changeUser(user.id, { role }, me.email);
  if (!res.ok) return res;
  done();
  return { ok: true, message: `เปลี่ยน ${user.email} เป็น${ROLE_LABEL[role]}แล้ว` };
}

export async function rejectUser(fd: FormData): Promise<void> {
  const { me, user } = await target(fd);
  if (user) await changeUser(user.id, { status: "rejected" }, me.email);
  done();
}

export async function disableUser(fd: FormData): Promise<void> {
  const { me, user } = await target(fd);
  if (user) await changeUser(user.id, { status: "disabled" }, me.email);
  done();
}

export async function enableUser(fd: FormData): Promise<void> {
  const { me, user } = await target(fd);
  if (user) await changeUser(user.id, { status: "active" }, me.email);
  done();
}

export async function removeUser(fd: FormData): Promise<void> {
  const { me, user } = await target(fd);
  if (user) await changeUser(user.id, "delete", me.email);
  done();
}
