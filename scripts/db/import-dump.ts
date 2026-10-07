/**
 * นำเข้าไฟล์ dump (.sql จาก mysqldump) ลงฐานข้อมูลตามค่าใน .env.local — ใช้ตอนย้ายข้อมูลขึ้น server ครั้งแรก
 * อ่านไฟล์เป็น UTF-8 แล้วส่งผ่าน mysql2 โดยตรง ไม่ต้องหา mysql.exe และไม่มีปัญหา PowerShell แปลง encoding ภาษาไทย
 *
 * รัน: npx tsx scripts/db/import-dump.ts C:\Apps\promptpilot.sql
 *      เติม --force เพื่อแทนที่ฐานข้อมูลที่มีข้อมูลอยู่แล้ว (ลบทุกตารางก่อน แล้วสร้างใหม่จาก dump)
 * ไฟล์ต้องเล็กกว่า max_allowed_packet ของ MySQL (ค่าเริ่มต้น 64 MB) เพราะส่งทั้งไฟล์ในคำสั่งเดียว
 */
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { dbConfig } from "../../src/db/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ใช้ env ของระบบแทน
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("ระบุไฟล์ dump เช่น npx tsx scripts/db/import-dump.ts C:\\Apps\\promptpilot.sql");

  const sql = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  if (!/CREATE TABLE/i.test(sql)) throw new Error(`${file} ไม่ใช่ไฟล์ dump ของ mysqldump (ไม่พบ CREATE TABLE)`);

  const cfg = dbConfig();
  const conn = await mysql.createConnection({ ...cfg, charset: "utf8mb4", multipleStatements: true });
  try {
    const [existing] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    if (existing.length > 0 && !force) {
      throw new Error(
        `ฐานข้อมูล ${cfg.database} มีตารางอยู่แล้ว ${existing.length} ตาราง — ไม่นำเข้าเพื่อกันข้อมูลเดิมหาย ` +
          "(ถ้าตั้งใจเขียนทับ ให้สำรองข้อมูลก่อนแล้วเติม --force)",
      );
    }
    if (existing.length > 0) {
      // ลบทุกตาราง ไม่ใช่แค่ตารางที่อยู่ใน dump — ไม่อย่างนั้นตารางจาก migration ที่ใหม่กว่า dump จะค้าง
      // แล้ว db:migrate รอบถัดไปสร้างตารางเดิมซ้ำไม่ได้
      console.log(`--force: ลบตารางเดิม ${existing.length} ตาราง`);
      const names = existing.map((r) => mysql.escapeId(String(r.name))).join(", ");
      await conn.query(`SET FOREIGN_KEY_CHECKS = 0; DROP TABLE ${names}; SET FOREIGN_KEY_CHECKS = 1;`);
    }
    const mb = (Buffer.byteLength(sql, "utf8") / 1024 / 1024).toFixed(1);
    console.log(`นำเข้า ${file} (${mb} MB) ลง ${cfg.database}@${cfg.host} ...`);
    try {
      await conn.query(sql);
    } catch (err) {
      if ((err as { code?: string }).code === "ER_NET_PACKET_TOO_LARGE") {
        throw new Error(`ไฟล์ ${mb} MB ใหญ่กว่า max_allowed_packet ของ MySQL — เพิ่มค่านี้ใน my.ini หรือนำเข้าด้วย mysql.exe แทน`);
      }
      throw err;
    }
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT (SELECT COUNT(*) FROM tools) AS tools, (SELECT COUNT(*) FROM guides) AS guides, " +
        "(SELECT COUNT(*) FROM news_items) AS news, (SELECT COUNT(*) FROM news_sources) AS sources",
    );
    const r = rows[0];
    console.log(`✅ นำเข้าเสร็จ: เครื่องมือ ${r.tools}, คู่มือ ${r.guides}, ข่าว ${r.news}, แหล่งข่าว ${r.sources}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
