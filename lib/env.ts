import "server-only";
import { z } from "zod";

// ตรวจสอบ environment variables ตอน boot — fail fast ถ้าตั้งค่าผิด
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters (use: openssl rand -base64 48)"),
  SESSION_MAX_AGE: z.coerce.number().int().positive().default(604800),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./storage/uploads"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().optional().default("auto"),
  S3_BUCKET: z.string().optional().default("docflow"),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v === "true"),
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(52428800),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `❌ Invalid environment variables:\n${issues}\n\nดู .env.example และตั้งค่าใน .env.local`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
