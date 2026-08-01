import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "กรุณากรอกอีเมลให้ถูกต้อง" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "กรุณากรอกรหัสผ่าน" }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
