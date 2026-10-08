"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/admin/ActionForm";
import { safeNext } from "@/lib/auth/safeNext";
import { createSession, destroySession } from "@/lib/auth/session";
import { clientIp, takeLoginAttempt } from "@/lib/auth/rateLimit";
import { countUsers, LOGIN_FAILED_MESSAGE, verifyLogin } from "@/lib/auth/users";

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const username = String(fd.get("username") ?? "").slice(0, 64);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  if (!username || !password) return { ok: false, message: "กรอกชื่อผู้ใช้และรหัสผ่าน" };

  if (!takeLoginAttempt(clientIp(await headers()))) return { ok: false, message: "ลองเข้าสู่ระบบบ่อยเกินไป รอ 5 นาทีแล้วลองใหม่" };

  const result = await verifyLogin(username, password);
  if (!result.ok) {
    if ((await countUsers()) === 0) {
      return { ok: false, message: "ยังไม่มีบัญชีผู้ใช้ในระบบ — ให้ผู้ดูแล server สร้างด้วยคำสั่ง npm run user:create" };
    }
    return { ok: false, message: LOGIN_FAILED_MESSAGE };
  }
  await createSession(result.userId);
  redirect(safeNext(fd.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
