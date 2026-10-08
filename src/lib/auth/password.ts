import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt ของ Node (ไม่ต้องลง library เพิ่ม) — ค่าพารามิเตอร์ตาม OWASP สำหรับ scrypt
const N = 1 << 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
// N=2^15, r=8 ใช้หน่วยความจำ ~32 MB เกินค่าเริ่มต้นของ Node (32 MB พอดี) จึงต้องเผื่อ
const MAXMEM = 64 * 1024 * 1024;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

/** รูปแบบที่เก็บใน DB: scrypt$N$r$p$saltBase64$hashBase64 — เก็บพารามิเตอร์ไว้ด้วย จะได้ปรับความแรงทีหลังได้ */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** hash ของรหัสสุ่ม ใช้เทียบเมื่อไม่พบชื่อผู้ใช้ — ให้เวลาตอบเท่ากับกรณีพบ จะได้เดาไม่ได้ว่าชื่อไหนมีอยู่จริง */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

/** ข้อความผิดพลาด หรือ null ถ้าใช้ได้ */
export function checkPasswordPolicy(password: string, username?: string): string | null {
  if (password.length < PASSWORD_MIN) return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`;
  if (password.length > PASSWORD_MAX) return `รหัสผ่านยาวเกิน ${PASSWORD_MAX} ตัวอักษร`;
  if (username && password.toLowerCase() === username.toLowerCase()) return "รหัสผ่านต้องไม่เหมือนชื่อผู้ใช้";
  // กันเฉพาะแบบที่ถูกเดาได้ทันที เช่น 11111111, 12345678, abcdefgh, qwertyui, password
  if (/^(.)\1+$/.test(password) || /^(0?12345678|abcdefgh|qwertyui|password)/i.test(password)) return "รหัสผ่านเดาง่ายเกินไป";
  return null;
}
