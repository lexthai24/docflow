"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { audit, AUDIT } from "@/lib/audit";
import { toErrorResponse } from "@/lib/errors";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";
import { z } from "zod";

const GeneralSettingsSchema = z.object({
  name: z.string().min(1, { error: "กรุณากรอกชื่อองค์กร" }).max(200),
  email: z.string().email({ error: "อีเมลไม่ถูกต้อง" }).or(z.literal("")).nullish(),
  phone: z.string().max(50).nullish(),
  address: z.string().max(500).nullish(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "รหัสสีไม่ถูกต้อง" }),
  timezone: z.string().min(1),
  locale: z.string().min(1),
});

export async function updateGeneralSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
    const parsed = GeneralSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    }
    const d = parsed.data;

    const before = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, primaryColor: true },
    });

    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        name: d.name,
        email: d.email || null,
        phone: d.phone || null,
        address: d.address || null,
        primaryColor: d.primaryColor,
        timezone: d.timezone,
        locale: d.locale,
      },
    });

    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.SETTINGS_CHANGED,
      entityType: "Organization",
      entityId: user.organizationId,
      oldValues: before,
      newValues: { name: d.name, primaryColor: d.primaryColor },
    });

    revalidatePath("/admin/settings");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}
