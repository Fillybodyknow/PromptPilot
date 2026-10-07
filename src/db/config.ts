/**
 * ค่าเชื่อมต่อ MySQL จาก env — ใช้ร่วมกันระหว่างแอป (client.ts) และ drizzle-kit (drizzle.config.ts)
 * ตั้งแยกช่อง: DB_NAME, DB_PASS (+ DB_HOST, DB_PORT ไม่ตั้งก็ได้ ค่าเริ่มต้น localhost:3306)
 * DB_USER ไม่ตั้งก็ได้ จะใช้ชื่อเดียวกับ DB_NAME (ตั้งเมื่อผู้ใช้ MySQL ชื่อไม่ตรงกับฐานข้อมูล)
 * รหัสผ่านที่มี @ : / ใส่ได้ตรงๆ ไม่ต้อง encode แบบใน URL
 * ยังรับ DATABASE_URL แบบเดิมได้ ถ้าไม่ได้ตั้ง DB_NAME
 */
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function dbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  if (env.DB_NAME) {
    return {
      host: env.DB_HOST || "localhost",
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER || env.DB_NAME,
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
  throw new Error("ยังไม่ได้ตั้งค่าฐานข้อมูล: ใส่ DB_NAME และ DB_PASS ใน .env.local (+ DB_USER ถ้าชื่อผู้ใช้ไม่ตรงกับ DB_NAME) (และ DB_HOST, DB_PORT ถ้าไม่ใช่ localhost:3306)");
}
