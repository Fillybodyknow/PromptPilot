import { and, asc, count, desc, eq, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users, type USER_ROLES, type USER_STATUSES } from "@/db/schema";
import { adminEmails } from "./config";
import type { AccountType, MicrosoftIdentity } from "./microsoft";

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export const ROLE_LABEL: Record<UserRole, string> = { admin: "ผู้ดูแลระบบ", editor: "ผู้ดูแลเนื้อหา", viewer: "ผู้อ่าน" };

/** เข้าหน้า admin ได้ไหม (ผู้อ่านอ่านได้อย่างเดียว) */
export const isStaff = (role: UserRole) => role === "admin" || role === "editor";
export const STATUS_LABEL: Record<UserStatus, string> = { pending: "รออนุมัติ", active: "ใช้งาน", rejected: "ปฏิเสธ", disabled: "ปิดใช้" };
export const ACCOUNT_LABEL: Record<AccountType, string> = {
  member: "พนักงาน",
  guest: "guest ที่บริษัทเชิญ",
  external: "บัญชีองค์กรอื่น",
  personal: "บัญชี Microsoft ส่วนตัว",
};

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
  accountType: AccountType;
  msTid: string;
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
  accountType: users.accountType,
  msTid: users.msTid,
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
 * อยู่ใน ADMIN_EMAILS ไหม — เทียบกับ UPN (ชื่อ login ที่ IT กำหนด) ของพนักงานเท่านั้น ไม่ใช้ claim email
 * เพราะ email ไม่ได้ผ่านการยืนยัน (บัญชีภายนอกตั้งเองได้) และไม่นับ guest / บัญชีองค์กรอื่น / บัญชีส่วนตัว
 */
export function isConfiguredAdmin(identity: Pick<MicrosoftIdentity, "upn" | "accountType">): boolean {
  return identity.accountType === "member" && identity.upn !== "" && adminEmails().has(identity.upn);
}

/** คำขอที่รออนุมัติได้สูงสุดพร้อมกัน — กันคนภายนอกส่งคำขอขยะจนรายการล้น */
export const MAX_PENDING = 200;
/** ต่อองค์กรภายนอกหนึ่ง tenant / บัญชีส่วนตัวทั้งหมด (บัญชีส่วนตัวใช้ tenant เดียวกันทุกคน) */
export const MAX_PENDING_PER_TENANT = 5;
export const MAX_PENDING_PERSONAL = 30;
/** คำขอที่ค้างเกินนี้ถูกลบเอง (คนนั้น login ใหม่ก็ส่งคำขอใหม่ได้) */
const PENDING_TTL_DAYS = 30;

export type UpsertResult = { id: number; status: UserStatus } | { id: null; status: "full" };

/**
 * เรียกหลัง login ด้วย Microsoft สำเร็จ: สร้างผู้ใช้ใหม่ถ้ายังไม่เคยเห็นคนนี้ และอัปเดตชื่อ/อีเมลถ้าเปลี่ยน
 * พนักงาน (บัญชีของ tenant บริษัท) เป็นผู้อ่านที่ใช้งานได้ทันที ส่วนคนอื่น (guest, บัญชีองค์กรอื่น, บัญชีส่วนตัว) ต้องรออนุมัติ
 * สิทธิ์เข้าหน้า admin (ผู้ดูแลเนื้อหา/ผู้ดูแลระบบ) ผู้ดูแลระบบเป็นคนให้ในหน้า /admin/users
 * ADMIN_EMAILS ใช้ตั้งผู้ดูแลระบบได้เฉพาะตอน "ยังไม่มีผู้ดูแลระบบที่ใช้งานได้เลย" (ติดตั้งครั้งแรก หรือกู้คืนเมื่อถูกปิดใช้หมด)
 * — ถ้ามีผู้ดูแลระบบอยู่แล้ว คนในรายชื่อเป็นผู้อ่านเหมือนพนักงานทั่วไป และการปิดใช้/ลดสิทธิ์ที่ผู้ดูแลทำไว้จะไม่ถูกย้อน
 * ทำใน transaction ที่ล็อกแถวผู้ดูแลระบบ กันสองคนในรายชื่อ login พร้อมกันแล้วต่างคนต่างคิดว่ายังไม่มีใคร
 */
export async function upsertMicrosoftUser(identity: MicrosoftIdentity): Promise<UpsertResult> {
  const now = new Date();
  const member = identity.accountType === "member";
  const homeTenant = identity.accountType === "member" || identity.accountType === "guest";
  const profile = { msTid: identity.tid, email: identity.email, displayName: identity.name, accountType: identity.accountType, updatedAt: now };
  // ชื่อ/อีเมลของบัญชีภายนอกเจ้าของตั้งเองได้ — เก็บค่าตอนส่งคำขอ (ที่ผู้ดูแลเห็นตอนอนุมัติ) ไว้ ไม่อัปเดตตามทุกครั้งที่ login
  // กันคนที่ได้รับอนุมัติแล้วเปลี่ยนชื่อ/อีเมลเป็นของคนอื่นภายหลัง (เช่นเปลี่ยนเป็นอีเมลผู้บริหาร) แล้วไปปรากฏในบันทึกการแก้ไข
  const refresh = member ? profile : { msTid: identity.tid, accountType: identity.accountType, updatedAt: now };
  const bootstrap = { role: "admin" as const, status: "active" as const, decidedBy: "ADMIN_EMAILS", decidedAt: now };
  // แถวที่สร้างก่อนรองรับหลาย tenant ไม่มี tid (เป็นบัญชีใน tenant บริษัททั้งหมด) — จับคู่ด้วย oid แล้วเติม tid ให้
  const identityMatch = homeTenant
    ? or(and(eq(users.msTid, identity.tid), eq(users.msOid, identity.oid)), and(eq(users.msTid, ""), eq(users.msOid, identity.oid)))
    : and(eq(users.msTid, identity.tid), eq(users.msOid, identity.oid));
  try {
    return await getDb().transaction(async (tx): Promise<UpsertResult> => {
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.status, "active")))
        .for("update");
      const makeAdmin = admins.length === 0 && isConfiguredAdmin(identity);
      const [existing] = await tx.select({ id: users.id, status: users.status }).from(users).where(identityMatch).for("update");
      if (existing) {
        // พนักงานที่ค้าง "รออนุมัติ" (เช่นเคยเป็น guest แล้ว IT เปลี่ยนเป็นบัญชีพนักงาน) อ่านเว็บได้เลย
        const promoteMember = !makeAdmin && member && existing.status === "pending";
        await tx
          .update(users)
          .set({ ...refresh, ...(makeAdmin ? bootstrap : promoteMember ? { status: "active" as const, role: "viewer" as const } : {}) })
          .where(eq(users.id, existing.id));
        return { id: existing.id, status: makeAdmin || promoteMember ? "active" : existing.status };
      }
      if (!member && !makeAdmin) {
        // คำขอจากภายนอก: เก็บกวาดคำขอเก่า แล้วไม่รับเพิ่มถ้าคิวเต็ม
        await tx
          .delete(users)
          .where(and(eq(users.status, "pending"), lt(users.requestedAt, new Date(now.getTime() - PENDING_TTL_DAYS * 86_400_000))));
        const [{ n }] = await tx.select({ n: count() }).from(users).where(eq(users.status, "pending"));
        // จำกัดต่อ tenant ด้วย — สร้าง tenant ใหม่ฟรี คนเดียวอาจสร้างบัญชีจำนวนมากมาเต็มคิวรวมจนคนจริงส่งคำขอไม่ได้
        const [{ m }] = await tx
          .select({ m: count() })
          .from(users)
          .where(and(eq(users.status, "pending"), eq(users.msTid, identity.tid)));
        const perTenant = identity.accountType === "personal" ? MAX_PENDING_PERSONAL : MAX_PENDING_PER_TENANT;
        if (n >= MAX_PENDING || m >= perTenant) return { id: null, status: "full" };
      }
      const [res] = await tx.insert(users).values({
        ...profile,
        msOid: identity.oid,
        role: "viewer",
        status: member ? "active" : "pending",
        requestedAt: now,
        ...(makeAdmin ? bootstrap : {}),
      });
      return { id: res.insertId, status: makeAdmin || member ? "active" : "pending" };
    });
  } catch (err) {
    // login ครั้งแรกพร้อมกันสองแท็บ — อีกแท็บสร้างไปแล้ว
    const code = (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;
    if (code !== "ER_DUP_ENTRY") throw err;
    const [row] = await getDb().select({ id: users.id, status: users.status }).from(users).where(identityMatch);
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

/** ปฏิเสธคำขอที่รออยู่ทั้งหมดจาก tenant เดียวกัน (ใช้เมื่อถูกส่งคำขอขยะจากองค์กรเดียวจำนวนมาก) คืนจำนวนที่ปฏิเสธ */
export async function rejectPendingFromTenant(tid: string, by: string): Promise<number> {
  const now = new Date();
  const [res] = await getDb()
    .update(users)
    .set({ status: "rejected", decidedBy: by.slice(0, 320), decidedAt: now, updatedAt: now })
    .where(and(eq(users.status, "pending"), eq(users.msTid, tid)));
  return res.affectedRows;
}
