import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

type Db = MySql2Database<typeof schema>;

// เก็บไว้บน globalThis กัน next dev สร้าง pool ใหม่ทุกครั้งที่ hot reload
const g = globalThis as unknown as { __ppPool?: mysql.Pool; __ppDb?: Db };

/** สร้าง pool ตอนใช้ครั้งแรก (ไม่ใช่ตอน import) เพื่อให้ next build ผ่านได้โดยไม่ต้องตั้ง DATABASE_URL */
export function getPool(): mysql.Pool {
  if (!g.__ppPool) {
    const uri = process.env.DATABASE_URL;
    if (!uri) throw new Error("ยังไม่ได้ตั้ง DATABASE_URL (เช่น mysql://user:pass@localhost:3306/promptpilot)");
    // timezone "Z": เก็บและอ่าน DATETIME เป็น UTC เสมอ ไม่ขึ้นกับ timezone ของเครื่อง
    g.__ppPool = mysql.createPool({ uri, timezone: "Z", charset: "utf8mb4", connectionLimit: 5 });
  }
  return g.__ppPool;
}

export function getDb(): Db {
  g.__ppDb ??= drizzle(getPool(), { schema, mode: "default" });
  return g.__ppDb;
}

/** สคริปต์ที่รันจบต้องเรียก ไม่อย่างนั้น pool ค้างไว้และ process ไม่ยอมจบ */
export async function closeDb(): Promise<void> {
  const pool = g.__ppPool;
  g.__ppPool = undefined;
  g.__ppDb = undefined;
  // ถ้าเชื่อมต่อไม่สำเร็จตั้งแต่แรก end() จะโยน error เดิมซ้ำ — error นั้นถูกรายงานไปแล้ว จึงไม่ให้ crash ตอนปิด
  await pool?.end().catch(() => {});
}
