import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE } from "./session-cookie";

/** login ครั้งหนึ่งใช้ได้ 12 ชั่วโมง (ครอบวันทำงาน) แล้วต้อง login ใหม่ */
const SESSION_HOURS = 12;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** cookie ต้องมี Secure เมื่อเว็บเปิดผ่าน HTTPS — ดูจาก Origin ของคำขอ เพราะหลัง IIS/Apache ตัวแอปเห็นแค่ http://127.0.0.1 */
async function isHttps(): Promise<boolean> {
  const h = await headers();
  return h.get("x-forwarded-proto") === "https" || (h.get("origin") ?? "").startsWith("https://");
}

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
    secure: await isHttps(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export interface SessionUser {
  sessionId: string;
  userId: number;
  username: string;
  displayName: string | null;
}

/** ผู้ใช้ที่ login อยู่ หรือ null — cache ต่อ request เพราะหน้าเดียวอาจเรียกหลายครั้ง */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const [row] = await getDb()
    .select({ userId: users.id, username: users.username, displayName: users.displayName })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()), eq(users.isActive, true)));
  return row ? { sessionId: id, ...row } : null;
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}
