/**
 * ดูรายชื่อผู้ใช้หน้า admin จาก command line (ปกติจัดการในหน้า /admin/users)
 * รัน: npm run user:list
 * ผู้ใช้ login ด้วย Microsoft — ตั้งผู้ดูแลระบบด้วย ADMIN_EMAILS ใน .env.local ไม่ได้สร้างบัญชีจากที่นี่
 */
import { closeDb } from "../src/db/client";
import { countByStatus, listUsers, ROLE_LABEL, STATUS_LABEL } from "../src/lib/auth/users";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

async function main(): Promise<void> {
  const rows = await listUsers();
  if (rows.length === 0) {
    console.log("ยังไม่มีผู้ใช้ — คนที่อยู่ใน ADMIN_EMAILS ให้ login ด้วย Microsoft ที่ /login ก่อน");
    return;
  }
  for (const u of rows) {
    const role = u.status === "active" ? ` · ${ROLE_LABEL[u.role]}` : "";
    console.log(`[${STATUS_LABEL[u.status]}] ${u.email}${u.displayName ? ` (${u.displayName})` : ""}${role} · login ล่าสุด ${u.lastLoginAt?.toISOString() ?? "-"}`);
  }
  console.log(JSON.stringify(await countByStatus()));
}

main()
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
