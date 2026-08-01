import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Prisma 7 ต้องใช้ driver adapter — ที่นี่ใช้ node-postgres (pg)
// connection string มาจาก DATABASE_URL (.env.local โหลดโดย Next.js อัตโนมัติ)

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and configure it.");
}

// pg (node-postgres) เตือนเรื่อง sslmode=require จะเปลี่ยนพฤติกรรมในอนาคต
// เพิ่ม uselibpqcompat=true เพื่อคง compatibility และปิด warning
const connectionString =
  rawUrl.includes("sslmode=require") && !rawUrl.includes("uselibpqcompat")
    ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}uselibpqcompat=true`
    : rawUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
