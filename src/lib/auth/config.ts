import { BASE_PATH } from "../basePath";

/**
 * ค่าตั้งค่า Microsoft login จาก .env.local (ดู DEPLOY.md หัวข้อลงทะเบียนแอปใน Entra ID)
 * MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET — จาก App registration
 * APP_URL — ที่อยู่เว็บที่ผู้ใช้เปิดจริง เช่น https://promptpilot.company.local (ใช้สร้าง redirect URI ให้ตรงกับที่ลงทะเบียน
 *           เพราะหลัง IIS/Apache ตัวแอปเห็นแค่ http://127.0.0.1)
 * ADMIN_EMAILS — อีเมลผู้ดูแลระบบที่เข้าได้ทันทีโดยไม่ต้องรออนุมัติ คั่นด้วย ,
 * MS_AUTHORITY — ไม่ต้องตั้ง (ค่าเริ่มต้น https://login.microsoftonline.com) ใช้กับ cloud พิเศษหรือตอนทดสอบ
 */
export function msSettings() {
  return {
    tenantId: process.env.MS_TENANT_ID?.trim() ?? "",
    clientId: process.env.MS_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.MS_CLIENT_SECRET?.trim() ?? "",
    authority: (process.env.MS_AUTHORITY?.trim() || "https://login.microsoftonline.com").replace(/\/+$/, ""),
  };
}

export function msConfigured(): boolean {
  const s = msSettings();
  return Boolean(s.tenantId && s.clientId && s.clientSecret);
}

/** origin ของเว็บที่ผู้ใช้เห็น (ไม่มี / ท้าย) */
export function appUrl(): string {
  return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export const isHttpsApp = () => appUrl().startsWith("https://");

/** redirect URI ที่ต้องลงทะเบียนไว้ใน Entra ID ให้ตรงทุกตัวอักษร */
export function msCallbackUrl(): string {
  return `${appUrl()}${BASE_PATH}/auth/microsoft/callback`;
}

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
