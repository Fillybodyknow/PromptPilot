/**
 * ค่าเชื่อมต่อ MySQL จาก env — ใช้ร่วมกันระหว่างแอป (client.ts) และ drizzle-kit (drizzle.config.ts)
 * ตั้งแยกช่อง: DB_USER, DB_PASS, DB_NAME (+ DB_HOST, DB_PORT ไม่ตั้งก็ได้ ค่าเริ่มต้น localhost:3306)
 * รหัสผ่านที่มี @ : / ใส่ได้ตรงๆ ไม่ต้อง encode แบบใน URL
 * ยังรับ DATABASE_URL แบบเดิมได้ ถ้าไม่ได้ตั้ง DB_USER
 */
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function dbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  if (env.DB_USER) {
    if (!env.DB_NAME) throw new Error("ตั้ง DB_USER แล้วแต่ยังไม่ได้ตั้ง DB_NAME");
    return {
      host: env.DB_HOST || "localhost",
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER,
      password: env.DB_PASS ?? "",
      database: env.DB_NAME,
    };
  }
  if (env.DATABASE_URL) {
    const u = new URL(env.DATABASE_URL);
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  throw new Error("ยังไม่ได้ตั้งค่าฐานข้อมูล: ใส่ DB_USER, DB_PASS, DB_NAME ใน .env.local (และ DB_HOST, DB_PORT ถ้าไม่ใช่ localhost:3306)");
}
