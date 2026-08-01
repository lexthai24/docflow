import "server-only";
import argon2 from "argon2";

// Password hashing ด้วย Argon2id (แนะนำในสเปคหมวด 3)
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
