import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users, type USER_ROLES, type USER_STATUSES } from "@/db/schema";
import { adminEmails } from "./config";
import type { MicrosoftIdentity } from "./microsoft";

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export const ROLE_LABEL: Record<UserRole, string> = { admin: "ผู้ดูแลระบบ", editor: "ผู้ดูแลเนื้อหา", viewer: "ผู้อ่าน" };

/** เข้าหน้า admin ได้ไหม (ผู้อ่านอ่านได้อย่างเดียว) */
export const isStaff = (role: UserRole) => role === "admin" || role === "editor";
export const STATUS_LABEL: Record<UserStatus, string> = { pending: "รออนุมัติ", active: "ใช้งาน", rejected: "ปฏิเสธ", disabled: "ปิดใช้" };

export interface UserRow {
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
  requestedAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
  lastLoginAt: Date | null;
  isGuest: boolean;
}

const cols = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  role: users.role,
  status: users.status,
  requestedAt: users.requestedAt,
  decidedBy: users.decidedBy,
  decidedAt: users.decidedAt,
  lastLoginAt: users.lastLoginAt,
  isGuest: users.isGuest,
};

export async function listUsers(): Promise<UserRow[]> {
  return getDb().select(cols).from(users).orderBy(desc(users.requestedAt), asc(users.email));
}

export async function getUser(id: number): Promise<UserRow | undefined> {
  const [row] = await getDb().select(cols).from(users).where(eq(users.id, id));
  return row;
}

export async function countPending(): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(users).where(eq(users.status, "pending"));
  return n;
}

/**
 * อยู่ใน ADMIN_EMAILS ไหม — เทียบกับ UPN (ชื่อ login ที่ IT กำหนด) เท่านั้น ไม่ใช้ claim email
 * เพราะ email ใน Entra ID ไม่ได้ผ่านการยืนยันและผู้ดูแล Microsoft 365 หลายระดับแก้ให้บัญชีอื่นได้
 * และไม่นับบัญชี guest จากองค์กรอื่น
 */
export function isConfiguredAdmin(identity: Pick<MicrosoftIdentity, "upn" | "guest">): boolean {
  return !identity.guest && identity.upn !== "" && adminEmails().has(identity.upn);
}

/**
 * เรียกหลัง login ด้วย Microsoft สำเร็จ: สร้างผู้ใช้ใหม่ถ้ายังไม่เคยเห็นคนนี้ และอัปเดตชื่อ/อีเมลถ้าเปลี่ยน
 * พนักงาน (บัญชีของ tenant เอง) เป็นผู้อ่านที่ใช้งานได้ทันที ส่วนบัญชี guest จากองค์กรอื่นต้องรอผู้ดูแลระบบอนุมัติ
 * สิทธิ์เข้าหน้า admin (ผู้ดูแลเนื้อหา/ผู้ดูแลระบบ) ผู้ดูแลระบบเป็นคนให้ในหน้า /admin/users
 * ADMIN_EMAILS ใช้ตั้งผู้ดูแลระบบได้เฉพาะตอน "ยังไม่มีผู้ดูแลระบบที่ใช้งานได้เลย" (ติดตั้งครั้งแรก หรือกู้คืนเมื่อถูกปิดใช้หมด)
 * — ถ้ามีผู้ดูแลระบบอยู่แล้ว คนในรายชื่อเป็นผู้อ่านเหมือนพนักงานทั่วไป และการปิดใช้/ลดสิทธิ์ที่ผู้ดูแลทำไว้จะไม่ถูกย้อน
 * ทำใน transaction ที่ล็อกแถวผู้ดูแลระบบ กันสองคนในรายชื่อ login พร้อมกันแล้วต่างคนต่างคิดว่ายังไม่มีใคร (ซึ่งก็ไม่อันตราย แต่ให้ผลแน่นอน)
 */
export async function upsertMicrosoftUser(identity: MicrosoftIdentity): Promise<{ id: number; status: UserStatus }> {
  const now = new Date();
  const profile = { email: identity.email, displayName: identity.name, isGuest: identity.guest, updatedAt: now };
  const bootstrap = { role: "admin" as const, status: "active" as const, decidedBy: "ADMIN_EMAILS", decidedAt: now };
  try {
    return await getDb().transaction(async (tx) => {
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.status, "active")))
        .for("update");
      const makeAdmin = admins.length === 0 && isConfiguredAdmin(identity);
      const [existing] = await tx.select({ id: users.id, status: users.status }).from(users).where(eq(users.msOid, identity.oid)).for("update");
      if (existing) {
        // พนักงานที่ค้าง "รออนุมัติ" (เช่นเคยเป็น guest แล้ว IT เปลี่ยนเป็นบัญชีพนักงาน) อ่านเว็บได้เลย
        const promoteMember = !makeAdmin && !identity.guest && existing.status === "pending";
        await tx
          .update(users)
          .set({ ...profile, ...(makeAdmin ? bootstrap : promoteMember ? { status: "active" as const, role: "viewer" as const } : {}) })
          .where(eq(users.id, existing.id));
        return { id: existing.id, status: makeAdmin || promoteMember ? "active" : existing.status };
      }
      const [res] = await tx.insert(users).values({
        msOid: identity.oid,
        ...profile,
        role: "viewer",
        status: identity.guest ? "pending" : "active",
        requestedAt: now,
        ...(makeAdmin ? bootstrap : {}),
      });
      return { id: res.insertId, status: makeAdmin || !identity.guest ? "active" : "pending" };
    });
  } catch (err) {
    // login ครั้งแรกพร้อมกันสองแท็บ — อีกแท็บสร้างไปแล้ว
    const code = (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;
    if (code !== "ER_DUP_ENTRY") throw err;
    const [row] = await getDb().select({ id: users.id, status: users.status }).from(users).where(eq(users.msOid, identity.oid));
    return row;
  }
}

export async function markLoggedIn(id: number): Promise<void> {
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
}

export type ChangeResult = { ok: true } | { ok: false; message: string };
type Change = { status?: UserStatus; role?: UserRole } | "delete";

/**
 * เปลี่ยนสถานะ/สิทธิ์ หรือลบผู้ใช้ — ไม่ยอมถ้าจะทำให้ไม่เหลือผู้ดูแลระบบที่ใช้งานได้เลย
 * ล็อกแถวผู้ดูแลระบบที่ใช้งานอยู่ทั้งหมดก่อน (FOR UPDATE) กันผู้ดูแลสองคนลดสิทธิ์/ปิดกันเองพร้อมกันจนไม่เหลือใคร
 * ถ้าผู้ใช้ถูกปิดใช้ ปฏิเสธ หรือลบ session ของเขาจะถูกลบทันที (ออกจากระบบทุกเครื่อง)
 */
export async function changeUser(id: number, change: Change, by: string): Promise<ChangeResult> {
  return getDb().transaction(async (tx) => {
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")))
      .for("update");
    const [target] = await tx.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, id)).for("update");
    if (!target) return { ok: false, message: "ไม่พบผู้ใช้นี้" };

    const isActiveAdmin = target.role === "admin" && target.status === "active";
    const staysActiveAdmin = change !== "delete" && (change.role ?? target.role) === "admin" && (change.status ?? target.status) === "active";
    if (isActiveAdmin && !staysActiveAdmin && admins.length <= 1) {
      return { ok: false, message: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน" };
    }

    if (change === "delete") {
      // session ถูกลบตามด้วย foreign key (cascade)
      await tx.delete(users).where(eq(users.id, id));
      return { ok: true };
    }
    const now = new Date();
    const statusChanged = change.status !== undefined && change.status !== target.status;
    await tx
      .update(users)
      .set({ ...change, updatedAt: now, ...(statusChanged ? { decidedBy: by.slice(0, 320), decidedAt: now } : {}) })
      .where(eq(users.id, id));
    if (change.status && change.status !== "active") await tx.delete(sessions).where(eq(sessions.userId, id));
    return { ok: true };
  });
}

/** สำหรับ scripts/user.ts */
export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await getDb()
    .select({ status: users.status, n: sql<number>`count(*)` })
    .from(users)
    .groupBy(users.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}
