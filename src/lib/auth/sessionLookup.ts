import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import type { AccountType } from "./microsoft";
import type { UserRole } from "./users";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface SessionUser {
  sessionId: string;
  userId: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  accountType: AccountType;
}

/**
 * หา session จาก token ใน cookie — ใช้ทั้งใน proxy.ts (ด่านหน้าของทุกหน้า) และใน session.ts
 * แยกไฟล์ไว้ไม่ให้ proxy ต้อง import next/headers หรือ React cache
 * คืน null ถ้าไม่พบ หมดอายุ หรือผู้ใช้ไม่อยู่ในสถานะ "ใช้งาน" (ถูกปิดใช้/ปฏิเสธ/รออนุมัติ)
 */
export async function findSessionByToken(token: string): Promise<SessionUser | null> {
  const id = hashToken(token);
  const [row] = await getDb()
    .select({ userId: users.id, email: users.email, displayName: users.displayName, role: users.role, accountType: users.accountType })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()), eq(users.status, "active")));
  return row ? { sessionId: id, ...row } : null;
}
