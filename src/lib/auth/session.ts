import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { isHttpsApp } from "./config";
import { SESSION_COOKIE } from "./session-cookie";
import type { UserRole } from "./users";

/** login ครั้งหนึ่งใช้ได้ 12 ชั่วโมง (ครอบวันทำงาน) แล้วต้อง login ใหม่ */
const SESSION_HOURS = 12;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3_600_000);
  const db = getDb();
  // เก็บกวาด session ที่หมดอายุไปพร้อมกัน — ไม่ต้องมีงานตามเวลาแยก
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.insert(sessions).values({ id: hashToken(token), userId, createdAt: now, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // ใช้ APP_URL ตัดสิน เพราะหลัง IIS/Apache ตัวแอปเห็นแค่ http://127.0.0.1
    secure: isHttpsApp(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export interface SessionUser {
  sessionId: string;
  userId: number;
  email: string;
  displayName: string | null;
  role: UserRole;
}

/** ผู้ใช้ที่ login อยู่และสถานะยังเป็น "ใช้งาน" หรือ null — cache ต่อ request เพราะหน้าเดียวอาจเรียกหลายครั้ง */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const [row] = await getDb()
    .select({ userId: users.id, email: users.email, displayName: users.displayName, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()), eq(users.status, "active")));
  return row ? { sessionId: id, ...row } : null;
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}
