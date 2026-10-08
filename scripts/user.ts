/**
 * จัดการผู้ใช้หน้า admin จาก command line — ใช้สร้างผู้ใช้คนแรก หรือกู้บัญชีเมื่อไม่มีใครเข้า admin ได้
 * ปกติให้จัดการผู้ใช้ในหน้า /admin/users
 *
 * รัน: npm run user:create -- <username> ["ชื่อที่แสดง"]   สร้างผู้ใช้ (ถามรหัสผ่าน)
 *      npm run user:password -- <username>                ตั้งรหัสใหม่ + ปลดล็อก + เปิดใช้บัญชี (ถามรหัสผ่าน)
 *      npm run user:list                                  ดูรายชื่อผู้ใช้
 *      npx tsx scripts/user.ts count                      พิมพ์จำนวนผู้ใช้ (install.ps1 ใช้)
 * รหัสผ่านจะถูกถามแบบไม่แสดงบนจอ หรือส่งผ่าน env PP_NEW_PASSWORD (สคริปต์ติดตั้งใช้) — ไม่รับทาง argument
 * เพราะ argument จะค้างอยู่ใน history ของ shell และคนอื่นในเครื่องเห็นได้จากรายการ process
 */
import { createInterface } from "node:readline";
import { closeDb, getDb } from "../src/db/client";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { checkPasswordPolicy } from "../src/lib/auth/password";
import { countUsers, createUser, listUsers, normalizeUsername, setPassword, setUserActive, USERNAME_RE } from "../src/lib/auth/users";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

/** ถามรหัสผ่านโดยไม่แสดงตัวอักษรบนจอ */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (!muted || s.includes("\n") || s.includes("\r")) out.output.write(muted ? "\n" : s);
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function readNewPassword(username: string): Promise<string> {
  const fromEnv = process.env.PP_NEW_PASSWORD;
  const password = fromEnv ?? (await askHidden("รหัสผ่านใหม่: "));
  const problem = checkPasswordPolicy(password, username);
  if (problem) throw new Error(problem);
  if (fromEnv === undefined && (await askHidden("ยืนยันรหัสผ่าน: ")) !== password) throw new Error("รหัสผ่านทั้งสองครั้งไม่ตรงกัน");
  return password;
}

async function main(): Promise<void> {
  const [command, rawName, displayName] = process.argv.slice(2);
  const username = rawName ? normalizeUsername(rawName) : "";

  switch (command) {
    case "count":
      console.log(await countUsers());
      return;
    case "list": {
      const rows = await listUsers();
      if (rows.length === 0) console.log("ยังไม่มีผู้ใช้ — สร้างด้วย npm run user:create -- <username>");
      for (const u of rows) {
        console.log(`${u.isActive ? "✓" : "✗"} ${u.username}${u.displayName ? ` (${u.displayName})` : ""} · login ล่าสุด ${u.lastLoginAt?.toISOString() ?? "-"}`);
      }
      return;
    }
    case "create": {
      if (!USERNAME_RE.test(username)) throw new Error("ระบุชื่อผู้ใช้ (a-z 0-9 . _ - ยาว 3–64 ตัว) เช่น npm run user:create -- admin");
      const password = await readNewPassword(username);
      const id = await createUser({ username, displayName: displayName?.trim() || null, password, createdBy: "command line" });
      if (id === null) throw new Error(`มีชื่อผู้ใช้ "${username}" อยู่แล้ว — ถ้าลืมรหัส ใช้ npm run user:password -- ${username}`);
      console.log(`✅ สร้างผู้ใช้ "${username}" แล้ว เข้าสู่ระบบได้ที่ /login`);
      return;
    }
    case "password": {
      const [row] = await getDb().select({ id: users.id }).from(users).where(eq(users.username, username));
      if (!row) throw new Error(`ไม่พบผู้ใช้ "${username}"`);
      const password = await readNewPassword(username);
      await setPassword(row.id, password);
      await setUserActive(row.id, true);
      console.log(`✅ ตั้งรหัสใหม่ให้ "${username}" แล้ว (ปลดล็อก เปิดใช้บัญชี และออกจากระบบทุกเครื่อง)`);
      return;
    }
    default:
      throw new Error("ใช้: user.ts create <username> [ชื่อที่แสดง] | password <username> | list | count");
  }
}

main()
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
