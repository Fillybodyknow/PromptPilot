import { defineConfig } from "drizzle-kit";
import { dbConfig } from "./src/db/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ไม่มีไฟล์ก็ได้ — ใช้ env ของระบบแทน (เช่นบน server)
}

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: dbConfig(),
});
