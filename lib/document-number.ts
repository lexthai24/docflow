import "server-only";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

// ระบบเลขที่เอกสาร (สเปคหมวด 35)
// รองรับ template: {PREFIX}-{YYYY}-{SEQ} ฯลฯ พร้อม transaction-safe sequence

export interface DocNumberConfig {
  prefix: string; // เช่น "DOC", "HR"
  includeYear: boolean;
  includeMonth: boolean;
  padding: number; // จำนวนหลักของ running number เช่น 6 → 000001
  resetPeriod: "yearly" | "monthly" | "never";
}

export const DEFAULT_DOC_NUMBER_CONFIG: DocNumberConfig = {
  prefix: "DOC",
  includeYear: true,
  includeMonth: false,
  padding: 6,
  resetPeriod: "yearly",
};

function buildScope(config: DocNumberConfig, prefix: string, now: Date): string {
  const parts = [prefix];
  if (config.resetPeriod === "yearly" && config.includeYear) {
    parts.push(String(now.getFullYear()));
  } else if (config.resetPeriod === "monthly") {
    parts.push(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`);
  } else {
    parts.push("all");
  }
  return parts.join("-");
}

function formatNumber(config: DocNumberConfig, prefix: string, seq: number, now: Date): string {
  const parts = [prefix];
  if (config.includeYear) parts.push(String(now.getFullYear()));
  if (config.includeMonth) parts.push(String(now.getMonth() + 1).padStart(2, "0"));
  parts.push(String(seq).padStart(config.padding, "0"));
  return parts.join("-");
}

/**
 * สร้างเลขที่เอกสารถัดไปแบบ transaction-safe
 * เรียกภายใน transaction เดียวกับการสร้าง document เพื่อกัน race condition
 * ต้องรับ tx client (จาก db.$transaction)
 */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  organizationId: string,
  config: DocNumberConfig = DEFAULT_DOC_NUMBER_CONFIG,
  prefixOverride?: string,
  now: Date = new Date(),
): Promise<string> {
  const prefix = prefixOverride || config.prefix;
  const scope = buildScope(config, prefix, now);

  const seq = await tx.documentSequence.upsert({
    where: { organizationId_scope: { organizationId, scope } },
    create: { organizationId, scope, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });

  return formatNumber(config, prefix, seq.value, now);
}
