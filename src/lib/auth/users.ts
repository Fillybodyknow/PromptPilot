import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { getDummyHash, hashPassword, verifyPassword } from "./password";

/** ใส่รหัสผิดติดกันกี่ครั้งจึงล็อก และล็อกนานเท่าไร */
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export const USERNAME_RE = /^[a-z0-9._-]{3,64}$/;
export const normalizeUsername = (s: string) => s.trim().toLowerCase();

export interface UserRow {
  id: number;
  username: string;
  displayName: string | null;
  isActive: boolean;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}

const publicCols = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  isActive: users.isActive,
  lockedUntil: users.lockedUntil,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  createdBy: users.createdBy,
};

export async function listUsers(): Promise<UserRow[]> {
  return getDb().select(publicCols).from(users).orderBy(asc(users.username));
}

export async function getUser(id: number): Promise<UserRow | undefined> {
  const [row] = await getDb().select(publicCols).from(users).where(eq(users.id, id));
  return row;
}

export async function countUsers(): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(users);
  return n;
}

/** คืน id ใหม่ หรือ null ถ้าชื่อผู้ใช้ซ้ำ (ชื่อเทียบแบบไม่สนตัวพิมพ์เล็กใหญ่ตาม collation ของ DB) */
export async function createUser(input: { username: string; displayName: string | null; password: string; createdBy: string | null }): Promise<number | null> {
  const now = new Date();
  try {
    const [res] = await getDb()
      .insert(users)
      .values({
        username: input.username,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        createdAt: now,
        createdBy: input.createdBy,
        updatedAt: now,
      });
    return res.insertId;
  } catch (err) {
    if ((err as { cause?: { code?: string }; code?: string }).cause?.code === "ER_DUP_ENTRY" || (err as { code?: string }).code === "ER_DUP_ENTRY") return null;
    throw err;
  }
}

/** ตั้งรหัสใหม่ + ปลดล็อก + ออกจากระบบทุกเครื่อง (ยกเว้น session ที่ระบุ เช่นของคนที่เปลี่ยนรหัสตัวเอง) */
export async function setPassword(id: number, password: string, keepSessionId?: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, id));
  await db.delete(sessions).where(keepSessionId ? and(eq(sessions.userId, id), ne(sessions.id, keepSessionId)) : eq(sessions.userId, id));
}

/** ตรวจรหัสปัจจุบันของผู้ใช้ (ใช้ตอนเปลี่ยนรหัสของตัวเอง) */
export async function checkUserPassword(id: number, password: string): Promise<boolean> {
  const [row] = await getDb().select({ hash: users.passwordHash }).from(users).where(eq(users.id, id));
  return row ? verifyPassword(password, row.hash) : false;
}

export async function setUserActive(id: number, active: boolean): Promise<void> {
  const db = getDb();
  await db.update(users).set({ isActive: active, failedLogins: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, id));
  if (!active) await db.delete(sessions).where(eq(sessions.userId, id));
}

export type LoginResult = { ok: true; userId: number; username: string } | { ok: false };

/**
 * ตรวจชื่อ/รหัส พร้อมนับครั้งที่ผิดและล็อกชั่วคราว
 * - นับครั้ง "ก่อน" ตรวจรหัสด้วย UPDATE เดียว (atomic) — ถ้าอ่านค่าแล้วค่อยเขียนทีหลัง คำขอที่ยิงพร้อมกันหลายร้อยครั้ง
 *   จะเห็นค่าเดิมหมดแล้วนับได้แค่ 1 เท่ากับได้เดารหัสหลายร้อยครั้งต่อการนับ
 * - ทุกกรณีที่ไม่ผ่าน (ไม่มีชื่อนี้ / ปิดใช้ / ถูกล็อก / รหัสผิด) ตอบเหมือนกันและใช้เวลาเท่ากัน จะได้เดาไม่ได้ว่าชื่อไหนมีจริง
 */
export async function verifyLogin(usernameInput: string, password: string): Promise<LoginResult> {
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash, isActive: users.isActive })
    .from(users)
    .where(eq(users.username, normalizeUsername(usernameInput)));

  let counted = false;
  if (user?.isActive) {
    // MySQL กำหนดค่าใน SET จากซ้ายไปขวา: locked_until คิดจาก failed_logins เดิมก่อน แล้วค่อยเพิ่ม/รีเซ็ต failed_logins
    // เวลาใน DB เก็บเป็น UTC (ดู client.ts) จึงใช้ UTC_TIMESTAMP
    const [res] = await db.execute(sql`
      UPDATE users
      SET locked_until = IF(failed_logins + 1 >= ${MAX_FAILED}, UTC_TIMESTAMP(3) + INTERVAL ${LOCK_MINUTES} MINUTE, NULL),
          failed_logins = IF(failed_logins + 1 >= ${MAX_FAILED}, 0, failed_logins + 1)
      WHERE id = ${user.id} AND (locked_until IS NULL OR locked_until <= UTC_TIMESTAMP(3))`);
    counted = (res as unknown as { affectedRows: number }).affectedRows === 1;
  }

  // ตรวจรหัสทุกกรณี (ใช้ hash หลอกถ้าไม่ได้ตรวจจริง) ให้ใช้เวลาเท่ากัน
  const ok = await verifyPassword(password, counted && user ? user.passwordHash : await getDummyHash());
  if (!ok || !counted || !user) return { ok: false };

  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return { ok: true, userId: user.id, username: user.username };
}

export const LOGIN_FAILED_MESSAGE = `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ใส่ผิด ${MAX_FAILED} ครั้งติดกัน บัญชีจะถูกล็อก ${LOCK_MINUTES} นาที)`;

/**
 * ปิดใช้หรือลบผู้ใช้ แต่ไม่ยอมถ้าจะทำให้ไม่เหลือผู้ใช้ที่เปิดใช้อยู่เลย
 * ล็อกแถวผู้ใช้ที่เปิดใช้ทั้งหมดก่อน (FOR UPDATE) — ถ้าผู้ดูแล 2 คนปิดกันเองพร้อมกัน คนหนึ่งจะต้องรออีกคน แล้วเห็นจำนวนที่ถูกต้อง
 * คืน false ถ้าไม่ได้ทำเพราะเป็นคนสุดท้าย
 */
export async function deactivateOrDeleteUser(id: number, action: "disable" | "delete"): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const active = await tx.select({ id: users.id }).from(users).where(eq(users.isActive, true)).for("update");
    if (active.some((u) => u.id === id) && active.length <= 1) return false;
    if (action === "delete") {
      // session ถูกลบตามด้วย foreign key (cascade)
      await tx.delete(users).where(eq(users.id, id));
    } else {
      await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
      await tx.delete(sessions).where(eq(sessions.userId, id));
    }
    return true;
  });
}
