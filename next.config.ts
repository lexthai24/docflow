import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ชี้ workspace root ให้ตรง (มี lockfile หลายตัวในเครื่อง)
  turbopack: {
    root: __dirname,
  },
  // ป้องกัน binary ของ argon2/prisma ถูก bundle เข้า serverless output ผิดๆ
  serverExternalPackages: ["argon2", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
