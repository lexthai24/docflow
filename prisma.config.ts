import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// DocFlow ใช้ .env.local เป็นหลักสำหรับค่าลับในเครื่อง dev
// (Next.js โหลด .env.local ให้อยู่แล้ว แต่ Prisma CLI ต้องโหลดเอง)
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ใช้ DIRECT_URL สำหรับ migrate ถ้ามี (เลี่ยง connection pooler),
    // ไม่งั้น fallback ไป DATABASE_URL
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
